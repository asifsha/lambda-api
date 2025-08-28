const cdk = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const cognito = require("aws-cdk-lib/aws-cognito");

class ApiStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Lambda function
    const apiLambda = new lambda.Function(this, "ApiHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "handler.handler", // ✅ Make sure you export `handler` in handler.js
    });

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, "MyUserPool", {
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

    // Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, "MyUserPoolClient", {
      userPool,
      generateSecret: false,
    });

    // API Gateway
    const api = new apigateway.RestApi(this, "ApiGateway", {
      restApiName: "Lambda API with Cognito",
      deployOptions: {
        stageName: "dev",
      },
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "MyAuthorizer", {
      cognitoUserPools: [userPool],
    });

    // Public route (health check)
    api.root.addResource("health").addMethod("GET", new apigateway.LambdaIntegration(apiLambda));

    // Secure routes
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

    // Output User Pool + Client IDs
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, "ApiUrl", { value: api.url });
  }
}

module.exports = { ApiStack };
