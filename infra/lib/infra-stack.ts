import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class QuizInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "QuizBucket", {
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    const api = new apigw.RestApi(this, "QuizApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });

    // Optional: seed an example quiz into quiz-content/ on first deploy
    new s3deploy.BucketDeployment(this, "SeedQuizzes", {
      sources: [s3deploy.Source.asset("../quizzes")],
      destinationBucket: bucket,
      destinationKeyPrefix: "quiz-content",
    });
    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const oac = new cloudfront.CfnOriginAccessControl(this, 'SiteOAC', {
      originAccessControlConfig: {
        name: 'SiteOAC',
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
      },
    });

    const distribution = new cloudfront.Distribution(this, "SiteDistribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: new origins.S3Origin(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(0),
        },
      ],
    });

    const cfnDistribution = distribution.node.defaultChild as cloudfront.CfnDistribution;
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', oac.getAtt('Id'));
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity', "");


    siteBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ["s3:GetObject"],
      resources: [siteBucket.arnForObjects("*")],
      principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
      conditions: {
        StringEquals: {
          "AWS:SourceArn": `arn:aws:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${distribution.distributionId}`,
        },
      },
    }));

    const subjectsLambda = new NodejsFunction(this, "SubjectsLambda", {
      entry: path.join(__dirname, "../lambda/list-subjects/index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      bundling: {
        externalModules: ["aws-sdk"],
      },
      environment: {
        SUBJECTS_BUCKET: bucket.bucketName,
      },
    });

    // Grant least-privilege read access to the quiz-content prefix only
    subjectsLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ["s3:GetObject"],
      resources: [bucket.arnForObjects("quiz-content/*")],
      effect: iam.Effect.ALLOW,
    }));

    // Allow listing the bucket (required for ListObjectsV2 on the prefix)
    subjectsLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ["s3:ListBucket"],
      resources: [bucket.bucketArn],
      effect: iam.Effect.ALLOW,
    }));

    const subjects = api.root.addResource("list-subjects");
  subjects.addMethod("GET", new apigw.LambdaIntegration(subjectsLambda));

    // ApiUrl output declared later


    // Use a deploy hash provided by -c deployHash=... at synth time (CI),
    // or fall back to a timestamp for local development. This makes the
    // deployment deterministic when CI computes the hash of frontend/dist.
    const deployHash = this.node.tryGetContext('deployHash') || new Date().toISOString();

    const deploySite = new s3deploy.BucketDeployment(this, "DeploySite", {
      sources: [
        s3deploy.Source.asset("../frontend/dist"),
        // Small deterministic marker so CDK asset hash changes when CI passes deployHash
        s3deploy.Source.data("deploy-hash.txt", deployHash),
      ],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
    });

    // Lambda
    const getQuestionsLambda = new NodejsFunction(this, "GetQuestionsLambda", {
      entry: path.join(__dirname, "../lambda/list-subjects/index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      bundling: {
        externalModules: ["aws-sdk"],
      },
      environment: {
        SUBJECTS_BUCKET: bucket.bucketName,
      },
    });

    // Grant least-privilege read access to the quiz-content prefix only
    getQuestionsLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ["s3:GetObject"],
      resources: [bucket.arnForObjects("quiz-content/*")],
      effect: iam.Effect.ALLOW,
    }));

    // API Gateway
    const getQuestions = api.root.addResource("get-questions");
    getQuestions.addMethod("GET", new apigateway.LambdaIntegration(getQuestionsLambda));


    new cdk.CfnOutput(this, "BucketName", { value: bucket.bucketName });
    new cdk.CfnOutput(this, "ApiUrl", { value: api.url });
    new cdk.CfnOutput(this, "CloudFrontURL", {value: "https://" + distribution.distributionDomainName});

    // Deploy a config.json file to the site bucket to be used at runtime by the frontend
    new s3deploy.BucketDeployment(this, "DeployConfig", {
      sources: [
        s3deploy.Source.data(
          "config.json",
          JSON.stringify({ VITE_API_URL: api.url })
        ),
      ],
      destinationBucket: siteBucket,
      // Invalidate the config file on deploy
      distribution,
      distributionPaths: ["/config.json"],
      // Prevent CloudFront and browsers from caching config.json so runtime
      // configuration changes propagate immediately.
      cacheControl: [s3deploy.CacheControl.noCache()],
    });
    // Ensure config.json is written after the site files so the frontend can fetch it
    // immediately after site deployment. This prevents races where CI uploads the
    // site then the config but CloudFront serves the old site.
    const deployConfig = this.node.tryFindChild('DeployConfig') as s3deploy.BucketDeployment | undefined;
    if (deployConfig) {
      deployConfig.node.addDependency(deploySite);
    }
  }
}
