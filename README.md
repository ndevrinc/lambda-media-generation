#Autosync S3 Bucket
A solution to automatically 'backup' created objects in one bucket to one or more other buckets.

Dependencies
============
AWS CLI: https://aws.amazon.com/cli/\
SAM: https://docs.aws.amazon.com/serverless-application-model/index.html\
Docker: https://docs.docker.com/\
Yarn: https://classic.yarnpkg.com/docs\

Installation
============
* Clone the repository, then make the desired code changes
```bash
git clone https://github.com/ndevrinc/autosync-s3-bucket.git
```

* Copy example files, make desired changes
```bash
yarn run examples
```

* Run build to generate all the necessary packages
```bash
yarn run build
```

* Run unit tests to make sure added customization passes the tests:
```bash
yarn run test
```

Use & Deployment
================
* Create a Amazon S3 Buckets for source and destination(s)
```
aws s3 mb s3://test-bucket-source1 --region us-east-1
```
> Note: You must have the AWS CLI installed.

* Using SAM, build
```bash
sam build
```
> Note: You must have SAM installed.

* Using SAM, execute lambda function locally
```bash
sam local invoke -e events/event.json
```
> Note: You must have Docker installed and running.

* Using SAM, deploy to Amazon
```bash
sam deploy --guided
```

* Add an Event Notification to the primary S3 Bucket
  * Under Properties > Events
  * Click "Add notification"
  * Name the envent something like "Autosync Bucket" would be good
  * Select "All object create events"
  * In "Send to" select "Lambda Function" and find your new Lambda function
  * Click Save
  * Add a new object and verify other bucket(s)

***

Copyright 2020 Ndevr, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.