#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { QuizInfraStack } from "../lib/infra-stack";

const app = new cdk.App();
new QuizInfraStack(app, "QuizInfraStack", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
