pipeline {
    agent any
    //tools {
	//jdk 'jdk21'
    //    nodejs 'node16'
    //}
    environment {
       SCANNAR_HOME=tool 'SonarScanner'
    }
    stages{
	stage('Clean Workspace'){
        steps{
            cleanWs()
        }
	}
	stage('Clone Netflix Repository'){
        steps{
            dir('netflix'){
                git branch : 'main', url: 'https://github.com/Aj7Ay/Netflix-clone.git'
            }
        }
	}
    stage('Clone Personal Project Repo'){
        steps{
            // this repository has Trivy.sh in it that can be used to scan files.
            git credentialsId: 'my_secret_token', url: 'https://github.com/WalaaHijazi1/CI-CD_DevOps_Project.git', branch: 'main'
        }
    }
    stage('SonarQube Analysis'){
        steps{
            dir('netflix'){
                // This stage runs a SonarQube code analysis on your project, sending the results to a configured SonarQube server named SonarScanner.
                withSonarQubeEnv('SonarQube'){
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
                    sh """
                        $SCANNAR_HOME/bin/sonar-scanner \
                        -Dsonar.projectKey=Netflix \
                        -Dsonar.projectName=Netflix \
                        -Dsonar.sources=. \
                        -Dsonar.host.url=http://sonarqube:9000
                    """
                    // running the command: docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' sonarqube to find sonarqube ip.                     
                }
            }
        }
    }
    stage('Quality Gate'){
        steps{
            dir('netflix'){
                // The quality gate stage is used to pause the pipeline and wait for SonarQube’s analysis result,
                // specifically checking if the Quality Gate is passed or failed.
                // ************************************************************
                // abortPipeline: false	-> If the quality gate fails, Jenkins will not abort the pipeline, it just logs the result.
                // (if false is changed to true the pipline will stop on failure.)
                waitForQualityGate abortPipeline: false, credentialsId: 'sonarqube_token'
            }
        }
    }
    stage('Install Dependencies'){
        steps{
            dir('netflix'){
                sh "npm install"
            }
        }
    }
    stage('OWASP FS SCAN'){
        steps{
            dir('netflix'){
                // dependencyCheck: This is a special Jenkins step provided by the OWASP Dependency-Check Plugin. It will: 
                // Use the CLI scanner (from the configured tool named 'owasp-dependency-check'), Scan the current directory (--scan ./) and Skip Yarn and Node audit steps.
                // odcInstallation: OWASP Dependency-Check tool.
                dependencyCheck additionalArguments: '--scan ./ --disableYarnAudit --disableNodeAudit', odcInstallation: 'owasp-dependency-check'
                // dependencyCheckPublisher: This takes the XML report generated from the scan and archives it.
                // a “Dependency-Check Report” tab in the Jenkins job will be appear after the pipeline is finished.
                dependencyCheckPuplisher pattern: 'dependency-check-report.xml'
            }
        }
    }
    stage('TRIVY FS scan'){
        steps{
            sh "trivy fs ./netflix > trivyfiles/trivyfs.txt"

        }
    }
    stage('Docker Build and Push img into local repo'){
        steps{
            dir('netflix'){
                withDockerRegistry(credentialsId: 'docker-username', url: 'https://index.docker.io/v1/'){
                    sh'''
                        docker build --build-arg TMDB_V3_API_KEY=616957b1221b87984af5b9edf7545682 -t netflix
                        docker tag netflix walaahij/netflix:latest
                        docker build -t netflix .
                        docker push walaahij/netflix:latest
                    '''
                }
            }
        }
    }
    stage('TRIVY image scan'){
        steps{
            sh 'trivy image walaahij/netflix:latest > trivyfiles/trivyimage.txt'
        }
    }
    stage('Deploy image into a Container'){
        steps{
            sh'docker run -d --name netflix -p 8000:80 walaahij/netflix:latest'
        }
    }
    stage('Deploy netflix to K8s'){
        steps{
            dir('netflix/Kubernetes'){
                withKubeConfig(credentialsId: 'k8s-creds'){
                    sh '''
                        # if netflix namespace does exist in the cluster the second command will fail the pipeline.
                        # by adding the first command will check if the namespace does exist if it will skip the second command.
                        kubectl get namespace netflix || kubectl create namespace netflix
                        kubectl apply -f deployment.yaml -n netflix
                        kubectl apply -f service.yaml -n netflix
                    '''
                }
            }
        }
    }
    stage('Deploy Prometheus and Grafana into K8s'){
        steps{
            withKubeConfig(credentialsId: 'k8s-creds'){
                sh '''
                    kubectl get namespace monitoring || kubectl create namespace monitoring
                    helm upgrade --install monitoring-stack ./mychart -n monitoring || helm install monitoring-stack ./mychart -n monitoring
                '''
            }
        }
    }
  }
    post {
        always {
            script {
                if (env.WORKSPACE && fileExists(env.WORKSPACE)) {
                    emailext attachLog: true,
                        subject: "'${currentBuild.result}'",
                        body: "Project: ${env.JOB_NAME}<br/>" +
                            "Build Number: ${env.BUILD_NUMBER}<br/>" +
                            "URL: ${env.BUILD_URL}<br/>",
                        to: 'hijaziwalaa69@gmail.com',
                        attachmentsPattern: 'trivyfs.txt,trivyimage.txt'
                } else {
                    echo "Workspace not found, skipping email notification."
                }
            }
        }
    }
}