# CloudDeploy CI/CD — Automated AWS Deployment Pipeline

A production-style REST API built with **Node.js/Express**, deployed to **AWS EC2**, storing files in **Amazon S3**, secured with **IAM Roles**, automatically deployed via a **GitHub Actions CI/CD pipeline**, monitored by a **Python automation script**, and fully **Dockerized**.

This project demonstrates end-to-end AWS Cloud/DevOps engineering: infrastructure, security, automation, CI/CD, and observability.

---

## Features

- **REST API** — root status, system health, file upload, file listing
- **AWS S3 integration** — secure file storage with server-side encryption
- **IAM Role-based auth** — zero hardcoded AWS credentials, uses EC2 instance metadata
- **CI/CD pipeline** — GitHub Actions builds, tests, and deploys on every push to `main`
- **Process management** — PM2 keeps the Node app alive and auto-restarts on deploy
- **System monitoring** — Python script logs CPU/RAM/disk every minute, with optional S3 log shipping
- **Containerized** — Dockerfile + docker-compose for local or container-based deployment
- **Security-conscious** — Security Groups, encrypted uploads, env-based config, input validation

---

## Architecture

```
 Developer
     |
     |  git push origin main
     v
 GitHub Repository
     |
     |  triggers workflow
     v
 GitHub Actions (CI/CD)
     |  1. npm ci
     |  2. npm test
     |  3. npm run build
     |  4. SSH into EC2 (appleboy/ssh-action)
     v
 AWS EC2 (Ubuntu 22.04)
     |  git pull origin main
     |  npm ci --omit=dev
     |  pm2 restart clouddeploy
     v
 Node.js / Express API  <-----  IAM Role (no hardcoded keys)
     |
     |  PutObjectCommand / ListObjectsV2Command
     v
 Amazon S3 Bucket (uploads/)

 Python health.py (cron, every 60s)
     |  psutil: CPU / RAM / Disk
     v
 Local log file  --(optional)-->  Amazon S3 (monitoring-logs/)
```

**Request flow example — file upload:**

```
Client --> POST /upload --> Multer (memory buffer) --> S3Client.PutObjectCommand --> S3 Bucket
                                                              ^
                                                              |
                                              Credentials resolved automatically
                                              from the EC2 Instance IAM Role
```

---

## AWS Services Used

| Service | Purpose | Cost |
|---|---|---|
| **EC2** | Hosts the Node.js API (t2.micro / t3.micro) | Free Tier |
| **S3** | Stores uploaded files and monitoring logs | Free Tier |
| **IAM** | Instance Role grants S3 access — no static credentials | Free |
| **Security Groups** | Firewall rules restricting inbound traffic | Free |

No paid AWS services (RDS, Lambda-with-provisioned-concurrency, NAT Gateway, etc.) are used.

---

## Tech Stack

Node.js · Express.js · AWS SDK v3 (`@aws-sdk/client-s3`) · Multer · AWS EC2 · AWS S3 · AWS IAM · GitHub Actions · Ubuntu Linux · PM2 · Python (`psutil`, `boto3`) · Docker · Docker Compose

---

## Project Structure

```
clouddeploy/
├── app.js                       # Express app entry point
├── package.json
├── .env.example                 # Environment variable template
├── .gitignore
├── routes/
│   ├── root.routes.js           # GET /
│   ├── health.routes.js         # GET /health
│   └── file.routes.js           # POST /upload, GET /files
├── controllers/
│   ├── root.controller.js
│   ├── health.controller.js     # CPU/RAM/disk/uptime via systeminformation
│   └── file.controller.js       # S3 PutObject / ListObjectsV2 logic
├── middleware/
│   ├── logger.middleware.js     # Request logging
│   ├── error.middleware.js      # Centralized error handler
│   └── upload.middleware.js     # Multer config, MIME + size validation
├── config/
│   ├── app.config.js            # Env validation, app constants
│   └── s3.config.js             # S3 client (IAM role-based, no static keys)
├── scripts/
│   ├── health.py                # Python monitoring automation
│   └── requirements.txt
├── tests/
│   └── app.test.js              # Node built-in test runner + supertest
├── .github/workflows/
│   └── deploy.yml               # CI/CD pipeline
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## API Endpoints

### `GET /`
```
CloudDeploy API Running
```

### `GET /health`
Returns CPU usage, memory usage, disk usage, server uptime, and current timestamp.
```json
{
  "success": true,
  "status": "healthy",
  "cpu": { "usagePercent": 4.2, "cores": 2 },
  "memory": { "totalMB": 3998, "usedMB": 620, "usagePercent": 15.5 },
  "disk": { "mount": "/", "totalGB": 30, "usedGB": 8.6, "usagePercent": 28.6 },
  "uptimeSeconds": 12345,
  "timestamp": "2026-07-13T08:44:55.804Z"
}
```

### `POST /upload`
Accepts `multipart/form-data` with a field named `file`. Streams the file directly to S3 (server-side encrypted, AES256).
```bash
curl -F "file=@./example.pdf" http://<EC2_PUBLIC_IP>:3000/upload
```

### `GET /files`
Lists every file currently stored in the S3 bucket under the `uploads/` prefix.
```bash
curl http://<EC2_PUBLIC_IP>:3000/files
```

---

## Installation & Local Setup

**Prerequisites:** Node.js 18+, npm, an AWS account, AWS CLI configured locally (for local S3 testing only).

```bash
git clone <your-repo-url>
cd clouddeploy
npm install
cp .env.example .env
# edit .env: set AWS_REGION and S3_BUCKET_NAME
npm start
```

The API will be available at `http://localhost:3000`.

Run tests:
```bash
npm test
```

### Run with Docker

```bash
cp .env.example .env
docker compose up --build
```

The container automatically picks up AWS credentials from your mounted `~/.aws` directory for local testing; on EC2, it uses the instance's IAM Role instead.

### Run the Python monitor locally

```bash
cd scripts
pip install -r requirements.txt
python3 health.py                # loop every 60s
python3 health.py --once         # single check
```

---

## AWS Deployment (EC2)

1. **Launch an EC2 instance**
   - AMI: Ubuntu 22.04 LTS
   - Instance type: `t2.micro` (Free Tier eligible)
   - Create/select a key pair for SSH

2. **Configure the Security Group**
   | Type | Port | Source | Purpose |
   |---|---|---|---|
   | SSH | 22 | Your IP only | Admin access |
   | Custom TCP | 3000 | `0.0.0.0/0` (or restrict as needed) | API access |
   | HTTP | 80 | `0.0.0.0/0` (optional, if fronted by Nginx) | Web access |

3. **Create an IAM Role for S3 access** (instead of hardcoded credentials)
   - IAM → Roles → Create role → AWS service → EC2
   - Attach a scoped policy limited to your bucket, e.g.:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": ["s3:PutObject", "s3:ListBucket", "s3:GetObject"],
           "Resource": [
             "arn:aws:s3:::your-clouddeploy-bucket-name",
             "arn:aws:s3:::your-clouddeploy-bucket-name/*"
           ]
         }
       ]
     }
     ```
   - Attach this role to the EC2 instance (Actions → Security → Modify IAM role)

4. **Create the S3 bucket**
   - Block all public access
   - Enable default encryption (SSE-S3/AES256)

5. **Bootstrap the instance**
   ```bash
   ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>

   sudo apt update && sudo apt install -y nodejs npm git python3-pip
   sudo npm install -g pm2

   git clone <your-repo-url> ~/clouddeploy
   cd ~/clouddeploy
   npm ci --omit=dev
   cp .env.example .env
   # edit .env with AWS_REGION and S3_BUCKET_NAME (no credentials needed — IAM role handles auth)

   pm2 start app.js --name clouddeploy
   pm2 startup
   pm2 save
   ```

6. **(Optional) Schedule the Python monitor via cron**
   ```bash
   crontab -e
   # add:
   * * * * * /usr/bin/python3 /home/ubuntu/clouddeploy/scripts/health.py --once >> /home/ubuntu/clouddeploy/logs/cron.log 2>&1
   ```

---

## GitHub Actions Setup

1. In your GitHub repo, go to **Settings → Secrets and variables → Actions** and add:

   | Secret | Description |
   |---|---|
   | `EC2_HOST` | Public IP or DNS of your EC2 instance |
   | `EC2_USERNAME` | SSH user, typically `ubuntu` |
   | `EC2_SSH_PRIVATE_KEY` | Contents of your EC2 `.pem` private key |
   | `REPO_URL` | HTTPS or SSH URL of this repository |
   | `APP_PORT` | (Optional) Port the app runs on, defaults to `3000` |

2. Push to `main` — the workflow at `.github/workflows/deploy.yml` will:
   1. Install dependencies (`npm ci`)
   2. Run tests (`npm test`)
   3. Build (`npm run build`)
   4. SSH into EC2, `git pull`, reinstall dependencies
   5. Restart the app with PM2
   6. Verify the `/health` endpoint responds

---

## Screenshots Required

> Capture and add these to a `/screenshots` folder for your portfolio submission:
1. EC2 instance running in the AWS Console (with IAM Role attached)
2. S3 bucket showing uploaded files under `uploads/`
3. IAM Role permissions/policy screen
4. Security Group inbound rules
5. GitHub Actions workflow run — green checkmarks for build/test/deploy
6. Terminal output of `pm2 status` on the EC2 instance
7. `GET /health` response in browser or Postman
8. Python monitoring log output (`logs/health.log`)

---

## Future Improvements

- Put the API behind an Nginx reverse proxy with HTTPS (Let's Encrypt)
- Add Application Load Balancer + Auto Scaling Group for high availability
- Move configuration to AWS Systems Manager Parameter Store / Secrets Manager
- Ship application + monitoring logs to CloudWatch Logs
- Add CloudWatch Alarms for CPU/memory/disk thresholds
- Add integration tests against a real (test) S3 bucket using LocalStack
- Add request-rate limiting and API key auth for `/upload`
- Infrastructure as Code: provision EC2/S3/IAM/SG with Terraform or AWS CDK
- Blue/green or rolling deployments instead of in-place PM2 restart

---

## Resume Bullet Points (Example)

- Designed and deployed a Node.js/Express REST API on **AWS EC2**, using an **IAM Role** for secure, credential-free access to **S3**
- Built a full **CI/CD pipeline** with **GitHub Actions** to automate testing, build, and **SSH-based deployment**, reducing manual release effort
- Automated system **monitoring** with a **Python** script tracking CPU/RAM/disk utilization, with optional log shipping to S3
- Containerized the application with **Docker** and **docker-compose** for portable, reproducible deployments
- Configured **Security Groups** and least-privilege **IAM** policies to enforce **cloud security** best practices across the **SDLC**

---

## License

MIT
