const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const cognito = require("aws-cdk-lib/aws-cognito");
const codedeploy = require("aws-cdk-lib/aws-codedeploy");

class ApiStack extends cdk.Stack {
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {cdk.StackProps} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // === Lambda Function ===
    const apiLambda = new lambda.Function(this, "ApiHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda"), // your lambda folder
      handler: "handler.handler",
    });

    // === Versions & Aliases ===
    const version = new lambda.Version(this, "ApiVersion", {
      lambda: apiLambda,
    });

    const prodAlias = new lambda.Alias(this, "ApiAliasProd", {
      aliasName: "prod",
      version,
    });

    const devAlias = new lambda.Alias(this, "ApiAliasDev", {
      aliasName: "dev",
      version,
    });

    // === Cognito User Pool ===
    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
    });

    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool,
    });

    // === API Gateway ===
    const api = new apigateway.RestApi(this, "ApiGateway", {
      restApiName: "MyApi",
      deploy: false, // manual stages
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "Authorizer", {
      cognitoUserPools: [userPool],
    });

    // Lambda Integrations
    const lambdaIntegrationProd = new apigateway.LambdaIntegration(prodAlias);
    const lambdaIntegrationDev = new apigateway.LambdaIntegration(devAlias);

     // Public route: /health
    api.root.addResource("health").addMethod(
      "GET",
      new apigateway.LambdaIntegration(apiLambda)
    );

    // Protected routes: /items
    const items = api.root.addResource("items");

    items.addMethod("GET", new apigateway.LambdaIntegration(apiLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    items.addMethod("POST", new apigateway.LambdaIntegration(apiLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    items.addMethod("PUT", new apigateway.LambdaIntegration(apiLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    items.addMethod("DELETE", new apigateway.LambdaIntegration(apiLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // === Deployments & Stages ===
    const deployment = new apigateway.Deployment(this, "Deployment", {
      api,
    });

    // Prod Stage with Canary
    new apigateway.Stage(this, "ProdStage", {
      deployment,
      stageName: "prod",
      canarySettings: {
        percentTraffic: 10, // 10% → new version
      },
    });

    // Dev Stage (no canary)
    new apigateway.Stage(this, "DevStage", {
      deployment,
      stageName: "dev",
    });

    // === CodeDeploy Canary for Prod ===
    new codedeploy.LambdaDeploymentGroup(this, "CanaryDeploymentGroup", {
      alias: prodAlias,
      deploymentConfig: codedeploy.LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
      autoRollback: {
        failedDeployment: true,
        stoppedDeployment: true,
      },
    });
  }
}

module.exports = { ApiStack };
