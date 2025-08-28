#!/usr/bin/env node
const cdk = require("aws-cdk-lib");
const { ApiStack } = require("../lib/api-stack");

const app = new cdk.App();
new ApiStack(app, "LambdaApiStack", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
