"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizInfraStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const constructs_1 = require("constructs");
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigw = __importStar(require("aws-cdk-lib/aws-apigateway"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
class QuizInfraStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const bucket = new s3.Bucket(this, "QuizBucket", {
            versioned: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
        });
        const listSubjectsFn = new lambda.Function(this, "ListSubjectsFn", {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: "index.handler",
            code: lambda.Code.fromAsset(path.join(__dirname, "../../lambda/list-subjects")),
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
