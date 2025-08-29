#!/usr/bin/env node
const cdk = require("aws-cdk-lib");
const { ApiStack } = require("../lib/api-stack");

const app = new cdk.App();

const stage = app.node.tryGetContext("stage") || "dev";

// ✅ unique stack per stage so dev & prod don’t overwrite each other
new ApiStack(app, `ApiStack-${stage}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  stage,
});
