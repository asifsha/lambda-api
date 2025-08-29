# 🚀 Serverless API with AWS Lambda, API Gateway, Cognito & CDK

This project is a **serverless REST API** built on AWS, using:

- **AWS Lambda** — Backend business logic
- **Amazon API Gateway** — API endpoint management
- **Amazon Cognito Authorizer** — Secured user authentication (JWT tokens)
- **AWS CDK (Cloud Development Kit)** — Infrastructure as code
- **GitHub Actions** — Continuous deployment (CI/CD) to AWS

---

## 📂 Project Structure

.\
├── lambda/ # Lambda function code\
├── cdk/ # CDK Infrastructure code\
├── .github/workflows/ # GitHub Actions workflows\
├── package.json\
└── README.md\


---

## ⚡ Features

- ✅ Serverless API with **Cognito Authorizer** (secure authentication)
- ✅ Separate **Dev** and **Prod** stages in API Gateway
- ✅ CI/CD with GitHub Actions — automatic deployment on push
- ✅ CDK-based Infrastructure as Code
- ✅ Easy to extend for new endpoints & services

---

## 🛠 Deployment Flow

1. **Developer pushes code to GitHub**
2. **GitHub Actions Workflow** runs:
   - Installs dependencies
   - Synthesizes CDK stack
   - Deploys stack to AWS
3. API Gateway + Lambda + Cognito are updated automatically

---

## 🔑 Authentication Flow

1. User signs in via **Cognito User Pool** (or client credentials).
2. User receives a **JWT Access Token**.
3. API requests must include the token in the `Authorization` header:

```http
GET https://<api-id>.execute-api.<region>.amazonaws.com/dev/resource
Authorization: Bearer <JWT_ACCESS_TOKEN>
```
🚦 GitHub Actions Workflow

The CI/CD pipeline is defined in .github/workflows/deploy.yml.

Push to dev branch → Deploys to Dev Stage

Push to main branch → Deploys to Prod Stage
```
if [ "${{ github.ref_name }}" = "main" ]; then
  npx cdk deploy --require-approval never --all -c stage=prod
else
  npx cdk deploy --require-approval never --all -c stage=dev
fi
```
📦 Setup & Installation
Prerequisites

Node.js 18+

AWS CLI configured

CDK CLI (npm install -g aws-cdk)

Deploy Locally
# Install dependencies
```
npm install
```
# Bootstrap CDK (first time only)
cdk bootstrap aws://<ACCOUNT_ID>/<REGION>

# Deploy (Dev)
```
cdk deploy --all -c stage=dev
```
# Deploy (Prod)
```
cdk deploy --all -c stage=prod
```
🔍 Testing the API

1. Get a Cognito Token
```
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id <APP_CLIENT_ID> \
  --auth-parameters USERNAME=<user>,PASSWORD=<password>
```

Copy the AccessToken from the output.

2. Call API Gateway
```
curl -X GET \
  https://<api-id>.execute-api.<region>.amazonaws.com/dev/resource \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
📘 Resources

AWS CDK Documentation

Amazon Cognito Documentation

API Gateway with Cognito Authorizer

GitHub Actions

📌 Notes

Make sure your GitHub Actions IAM Role has permissions for:

cloudformation:*\
lambda:*\
apigateway:*\
cognito-idp:*\
ssm:GetParameter\
Dev and Prod are deployed in separate stages but share the same CDK stack logic.\
Extend Lambda functions inside lambda/ folder.\

🎯 Future Improvements

Add unit tests for Lambda functions\
Add monitoring & logging with CloudWatch\
Add automated rollback on failed deployment\
Add CI/CD notifications (Slack/Email)\
