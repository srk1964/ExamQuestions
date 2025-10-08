import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";

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

    new cdk.CfnOutput(this, "BucketName", { value: bucket.bucketName });
    new cdk.CfnOutput(this, "ApiUrl", { value: api.url });
  }
}
