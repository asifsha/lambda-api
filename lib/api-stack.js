const cdk = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const cognito = require("aws-cdk-lib/aws-cognito");
const codedeploy = require("aws-cdk-lib/aws-codedeploy");

class ApiStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const stage = props.stage || "dev"; // default = dev

    // Lambda function
    const apiLambda = new lambda.Function(this, "ApiHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "handler.handler",
    });

    // ✅ Lambda Version + Stage-specific Alias
    const version = new lambda.Version(this, `ApiLambdaVersion-${stage}`, {
      lambda: apiLambda,
    });

    const alias = new lambda.Alias(this, `ApiLambdaAlias-${stage}`, {
      aliasName: stage, // alias = "dev" or "prod"
      version,
    });

    // ✅ CodeDeploy Canary Deployment (per stage)
    new codedeploy.LambdaDeploymentGroup(this, `ApiDeploymentGroup-${stage}`, {
      alias,
      deploymentConfig: codedeploy.LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
    });

    // Cognito User Pool (stage-specific)
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
      generateSecret: false,
    });

    // API Gateway (stage-specific)
    const api = new apigateway.RestApi(this, `ApiGateway-${stage}`, {
      restApiName: `Lambda API with Cognito (${stage})`,
      deployOptions: {
        stageName: stage,
      },
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, `Authorizer-${stage}`, {
      cognitoUserPools: [userPool],
    });

    // Public route
    api.root.addResource("health").addMethod("GET", new apigateway.LambdaIntegration(apiLambda));

    // Secure routes (using alias for canary deployments)
    const items = api.root.addResource("items");

    items.addMethod("GET", new apigateway.LambdaIntegration(alias), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    items.addMethod("POST", new apigateway.LambdaIntegration(alias), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    items.addMethod("PUT", new apigateway.LambdaIntegration(alias), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    items.addMethod("DELETE", new apigateway.LambdaIntegration(alias), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Outputs
    new cdk.CfnOutput(this, `UserPoolId-${stage}`, { value: userPool.userPoolId });
    new cdk.CfnOutput(this, `UserPoolClientId-${stage}`, { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, `ApiUrl-${stage}`, { value: api.url });
  }
}

module.exports = { ApiStack };
