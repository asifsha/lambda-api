const cdk = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const cognito = require("aws-cdk-lib/aws-cognito");
const codedeploy = require("aws-cdk-lib/aws-codedeploy");
const cloudwatch = require("aws-cdk-lib/aws-cloudwatch");

class ApiStack extends cdk.Stack {
  constructor(scope, id, props = {}) {
    super(scope, id, props);
    const stage = props.stage || "dev";

    // === Lambda (business logic) ===
    const apiLambda = new lambda.Function(this, `ApiHandler-${stage}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "handler.handler", // lambda/handler.js -> exports.handler = async (...)
      environment: {
        STAGE: stage,
      },
    });

    // Publish a Version on each deploy
    const version = new lambda.Version(this, `ApiLambdaVersion-${stage}`, {
      lambda: apiLambda,
    });

    // Alias per stage (dev/prod). API Gateway integrates with the alias (not $LATEST)
    const alias = new lambda.Alias(this, `ApiLambdaAlias-${stage}`, {
      aliasName: stage,
      version,
    });

    // === CloudWatch Alarm(s) for automatic rollback ===
    // Roll back if there are any function errors during the canary bake time
    const errorAlarm = new cloudwatch.Alarm(this, `LambdaErrorsAlarm-${stage}`, {
      metric: alias.metricErrors(), // errors on the ALIAS (new version traffic)
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: `Trigger rollback if ${stage} alias records errors during canary.`,
    });

    // === CodeDeploy deployment group with CANARY + auto-promotion ===
    // CANARY_10PERCENT_5MINUTES: shift 10% traffic, wait 5 min, then 100% if no alarms
    new codedeploy.LambdaDeploymentGroup(this, `ApiDeploymentGroup-${stage}`, {
      alias,
      deploymentConfig: codedeploy.LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
      alarms: [errorAlarm],
      autoRollback: {
        failedDeployment: true,
        stoppedDeployment: true,
        deploymentInAlarm: true, // if the alarm breaches, rollback
      },
    });

    // === Cognito (per stage) ===
    const userPool = new cognito.UserPool(this, `UserPool-${stage}`, {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
    });

    const userPoolClient = new cognito.UserPoolClient(this, `UserPoolClient-${stage}`, {
      userPool,
      generateSecret: false, // SPA/mobile style; set true for confidential clients
      authFlows: { userPassword: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
      },
    });

    // === API Gateway (per stage) ===
    const api = new apigateway.RestApi(this, `ApiGateway-${stage}`, {
      restApiName: `Lambda API with Cognito (${stage})`,
      deployOptions: { stageName: stage },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Authorization", "Content-Type"],
      },
    });

    // Cognito Authorizer (unique per stage to prevent conflicts)
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, `Authorizer-${stage}`, {
      cognitoUserPools: [userPool],
      authorizerName: `Authorizer-${stage}`,
    });

    // === Routes ===
    // Public health endpoint (points to function directly; can keep lightweight)
    api.root
      .addResource("health")
      .addMethod("GET", new apigateway.LambdaIntegration(apiLambda));

    const items = api.root.addResource("items");

    // Integrate secured routes with the ALIAS (so traffic shifting applies)
    const securedIntegration = new apigateway.LambdaIntegration(alias);

    ["GET", "POST", "PUT", "DELETE"].forEach((method) => {
      items.addMethod(method, securedIntegration, {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
    });

    // === Outputs ===
    new cdk.CfnOutput(this, `ApiUrl-${stage}`, { value: api.url });
    new cdk.CfnOutput(this, `UserPoolId-${stage}`, { value: userPool.userPoolId });
    new cdk.CfnOutput(this, `UserPoolClientId-${stage}`, {
      value: userPoolClient.userPoolClientId,
    });
  }
}

module.exports = { ApiStack };
