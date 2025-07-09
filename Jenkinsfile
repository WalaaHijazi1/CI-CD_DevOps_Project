pipeline {
    agent any
    tools {
        nodejs 'node20'
    }
    environment {
        SCANNAR_HOME = tool 'SonarScanner'
    }
    stages {
        stage('Clean Workspace') {
            steps {
                cleanWs()
            }
        }

        stage('Verify Java and Node Version') {
            steps {
                sh 'node -v'
                sh 'npm -v'
                sh 'java -version'
            }
        }
        stage('Clone Repository With Netflix & Node-Exporter') {
            steps {
                deleteDir()
                git credentialsId: 'my_secret_token', url: 'https://github.com/WalaaHijazi1/CI-CD_DevOps_Project.git', branch: 'main'
            }
        }

        stage('SonarQube Analysis'){
            steps{
                withSonarQubeEnv('SonarQube'){
                    // This stage runs a SonarQube code analysis on your project, sending the results to a configured SonarQube server named SonarScanner.
                    // This is a Jenkins Pipeline step provided by the SonarQube Scanner plugin.
                    // It temporarily injects environment variables (like SONAR_HOST_URL, SONAR_AUTH_TOKEN)
                    // so the SonarScanner CLI knows how to reach the SonarQube server.
                    // *************************************************************************************
                    //  $SCANNAR_HOME/bin/SonarScanner : Executes the SonarScanner command inside the shell.
                    // The SANNER_HOME environment variable is usually defined by Jenkins (or your pipeline)
                    // and points to the installed SonarQube Scanner directory.
                    //************************************************************
                    //sh ''' $SCANNAR_HOME/bin/SonarScanner -Dsonar.projectName=Netflix \
                    //-Dsonar.projectName=Netflix '''
                    // $SCANNAR_HOME/bin/sonar-scanner \
                    sh '''
                        $SCANNAR_HOME/bin/sonar-scanner \
                            -Dsonar.projectKey=Netflix \
                            -Dsonar.projectName=Netflix \
                            -Dsonar.sources=. \
                            -Dsonar.host.url=http://65.0.39.254:9000
                        '''
                    // running the command: docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' sonarqube to find sonarqube ip.
                }
            }
        }
        stage('Quality Gate'){
            steps{
                // The quality gate stage is used to pause the pipeline and wait for SonarQube’s analysis result,
                // specifically checking if the Quality Gate is passed or failed.
                // ************************************************************
                // abortPipeline: false -> If the quality gate fails, Jenkins will not abort the pipeline, it just logs the result.
                // (if false is changed to true the pipline will stop on failure.)
                waitForQualityGate abortPipeline: false, credentialsId: 'sonar-token'
            }
        }
        stage('Install Dependencies') {
            steps {
                    sh 'npm install --include=dev'
            }
        }
        stage('Fix Vulnerabilities') {
            steps {
                    sh 'npm install vite@^3.0.0'
                    sh 'npm audit fix --force'
                    sh 'npm audit --audit-level=high || true'
            }
        }
        stage('OWASP FS SCAN'){
            steps{
                // dependencyCheck: This is a special Jenkins step provided by the OWASP Dependency-Check Plugin. It will:
                // Use the CLI scanner (from the configured tool named 'owasp-dependency-check'), Scan the current directory (--scan ./) and Skip Yarn and Node audit steps.
                // odcInstallation: OWASP Dependency-Check tool.
                dependencyCheck additionalArguments: '--scan ./ --disableYarnAudit --disableNodeAudit', odcInstallation: 'owasp-dependency-check'
                // dependencyCheckPublisher: This takes the XML report generated from the scan and archives it.
                // a “Dependency-Check Report” tab in the Jenkins job will be appear after the pipeline is finished.
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
            }
        }
        stage('Check Trivy Installation') {
            steps {
                sh 'trivy --version || echo "Trivy not found"'
            }
        }

        stage('Trivy FS Scan') {
            steps {
                    sh 'mkdir -p trivyfiles && trivy fs . > ../trivyfiles/trivyfs.txt'
            }
        }
        stage('Docker Build and Push') {
            steps {
                    withCredentials([usernamePassword(credentialsId: 'docker-username', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASSWORD')]) {
                        sh '''
                            echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USER} --password-stdin
                            docker build --build-arg TMDB_V3_API_KEY=616957b1221b87984af5b9edf7545682 -t walaahij/netflix:${BUILD_ID} .
                            docker push walaahij/netflix:${BUILD_ID} || { echo "❌ Docker push failed"; exit 1; }
                        '''
                }
            }
        }
        stage('Trivy Image Scan') {
            steps {
                sh 'trivy image walaahij/netflix:${BUILD_ID} > trivyfiles/trivyimage.txt'
            }
        }

        stage('Run Locally') {
            steps {
                sh '''
                    docker rm -f netflix || true
                    docker run -d --name netflix -p 8000:80 walaahij/netflix:${BUILD_ID}
                '''
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                dir('Kubernetes') {
                    withKubeConfig(credentialsId: 'k8s-creds') {
                        sh '''
                            kubectl delete service netflix-app -n netflix || true
                            kubectl get namespace netflix || kubectl create namespace netflix
                            kubectl apply -f deployment.yml -n netflix
                            kubectl apply -f service.yml -n netflix
                            kubectl rollout status deployment/netflix-app -n netflix --timeout=5m
                            kubectl get pods -n netflix -o wide
                        '''
                    }
                }
            }
        }

        stage('Deploy Node Exporter') {
            steps {
                dir('node-exporter'){
                    withKubeConfig(credentialsId: 'k8s-creds') {
                        sh '''
                            kubectl get namespace monitoring || kubectl create namespace monitoring
                            kubectl apply -f node-exporter-deployment.yaml -n monitoring
                            kubectl apply -f node-exporter-service.yaml -n monitoring
                            kubectl get pods -n monitoring -o wide
                        '''
                    }
                }
            }
        }
    }
   post {
      always {
        script {
          if (env.WORKSPACE && fileExists("${env.WORKSPACE}/.")) {
            emailext attachLog: true,
              subject: "${currentBuild.result}",
              body: """Project: ${env.JOB_NAME}<br/>
                       Build Number: ${env.BUILD_NUMBER}<br/>
                       URL: ${env.BUILD_URL}<br/>""",
              to: 'hijaziwalaa69@gmail.com',
              attachmentsPattern: 'trivy*.txt'
          } else {
            echo "Workspace not found, skipping email notification."
          }
        }
      }
    }
}