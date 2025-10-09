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
      websiteIndexDocument: "index.html",
      publicReadAccess: false,
    });

       // Create an Origin Access Identity
         const oai = new cloudfront.OriginAccessIdentity(this, "SiteOAI");

        // Grant CloudFront read access via a bucket policy that references the OAI canonical user
         siteBucket.addToResourcePolicy(new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [siteBucket.arnForObjects("*")],
        principals: [new iam.CanonicalUserPrincipal(oai.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
         }));

        const distribution = new cloudfront.Distribution(this, "SiteDistribution", {
         defaultRootObject: "index.html",
         defaultBehavior: { origin: origins.S3BucketOrigin.withOriginAccessIdentity(siteBucket, { originAccessIdentity: oai }),
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


    const subjects = api.root.addResource("list-subjects");
  subjects.addMethod("GET", new apigw.LambdaIntegration(subjectsLambda));

    // ApiUrl output declared later


    new s3deploy.BucketDeployment(this, "DeploySite", {
      sources: [s3deploy.Source.asset("../frontend/dist")],
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
    
  }
}
