const cdk = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const cognito = require("aws-cdk-lib/aws-cognito");

class ApiStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const stage = props.stage || "dev";

    // Lambda function
    const apiLambda = new lambda.Function(this, `ApiHandler-${stage}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "handler.handler",
    });

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, `MyUserPool-${stage}`, {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
    });

    const userPoolClient = new cognito.UserPoolClient(this, `MyUserPoolClient-${stage}`, {
      userPool,
      generateSecret: false,
    });

    // API Gateway
    const api = new apigateway.RestApi(this, `ApiGateway-${stage}`, {
      restApiName: `Lambda API with Cognito (${stage})`,
      description: `API for ${stage} stage`,
      deploy: false, // disable auto deploy
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, `MyAuthorizer-${stage}`, {
      cognitoUserPools: [userPool],
    });

    // Routes
    api.root.addResource("health").addMethod("GET", new apigateway.LambdaIntegration(apiLambda));

    const items = api.root.addResource("items");

    ["GET", "POST", "PUT", "DELETE"].forEach((method) => {
      items.addMethod(method, new apigateway.LambdaIntegration(apiLambda), {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
    });

    // Explicit deployment + stage
    const deployment = new apigateway.Deployment(this, `Deployment-${stage}`, {
      api,
    });

    const apiStage = new apigateway.Stage(this, `Stage-${stage}`, {
      deployment,
      stageName: stage,
    });

    api.deploymentStage = apiStage;

    // Outputs
    new cdk.CfnOutput(this, `UserPoolId-${stage}`, { value: userPool.userPoolId });
    new cdk.CfnOutput(this, `UserPoolClientId-${stage}`, { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, `ApiUrl-${stage}`, { value: apiStage.urlForPath() });
  }
}

module.exports = { ApiStack };
