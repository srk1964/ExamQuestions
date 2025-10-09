import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

export class QuizInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "QuizBucket", {
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    const listSubjectsFn = new lambda.Function(this, "ListSubjectsFn", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("../lambda/list-subjects"),
      environment: { QUIZ_BUCKET: bucket.bucketName },
    });
    bucket.grantRead(listSubjectsFn);

    const api = new apigw.RestApi(this, "QuizApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });
    api.root.addResource("list-subjects")
      .addMethod("GET", new apigw.LambdaIntegration(listSubjectsFn));

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

   // Grant CloudFront read access
    siteBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ["s3:GetObject"],
      resources: [siteBucket.arnForObjects("*")],
      principals: [new iam.CanonicalUserPrincipal(oai.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
    }));

    const distribution = new cloudfront.Distribution(this, "SiteDistribution", {
      defaultBehavior: { origin: new origins.S3Origin(siteBucket) },
    });

    new s3deploy.BucketDeployment(this, "DeploySite", {
      sources: [s3deploy.Source.asset("../frontend/dist")],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
    });
    new cdk.CfnOutput(this, "BucketName", { value: bucket.bucketName });
    new cdk.CfnOutput(this, "ApiUrl", { value: api.url });
    new cdk.CfnOutput(this, "CloudFrontURL", {value: "https://" + distribution.distributionDomainName});

  }
}
