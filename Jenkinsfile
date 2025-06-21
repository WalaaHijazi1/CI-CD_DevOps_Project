pipeline {
    agent any
    tools {
	jdk 'jdk21'
        nodejs 'node16'
    }
    environment {
       SCANNAR_HOME=tool 'sonar-scanner'
    }
    stages{
	stage('Clean Workspace'){
        steps{
            CleanWs()
        }
	}
	stage('Clone Netflix Repository'){
        steps{
            git branch : 'main', url: 'https://github.com/Aj7Ay/Netflix-clone.git'
        }
	}
    stage('SonarQube Analysis'){
        steps{
            // This stage runs a SonarQube code analysis on your project, sending the results to a configured SonarQube server named sonar-scanner.
            withSonarQubeEnv('SonarQube')
            // This is a Jenkins Pipeline step provided by the SonarQube Scanner plugin.
            // It temporarily injects environment variables (like SONAR_HOST_URL, SONAR_AUTH_TOKEN)
            // so the sonar-scanner CLI knows how to reach the SonarQube server.
            // *************************************************************************************
            //  $SCANNAR_HOME/bin/sonar-scanner : Executes the sonar-scanner command inside the shell.
            // The SANNER_HOME environment variable is usually defined by Jenkins (or your pipeline) 
            // and points to the installed SonarQube Scanner directory.
            sh ''' $SCANNAR_HOME/bin/sonar-scanner -Dsonar.projectName=Netflix \
            -Dsonar.projectName=Netflix '''
        }
    }
    stage('Quality Gate'){
        steps{
            // The quality gate stage is used to pause the pipeline and wait for SonarQube’s analysis result,
            // specifically checking if the Quality Gate is passed or failed.
            // ************************************************************
            // abortPipeline: false	-> If the quality gate fails, Jenkins will not abort the pipeline, it just logs the result.
            // (if false is changed to true the pipline will stop on failure.)
            waitforQualityGate abortPipeline: false, credentialsId: 'sonarqube_token'
        }
    }
    stage('Install Dependencies'){
        steps{
            sh "npm install"
        }
    }
    stage('OWASP FS SCAN'){
        steps{
            dependencyCheck additionalArguments: '--scan ./ --disableYarnAudit --disableNodeAudit', odc installation: 'owasp-dependency-check'
            dependencyCheckPuplisher pattern: '/dependency-check-report.xml'
        }
    }
    stage('TRIVY FS scan'){
        steps{
            sh'trivy fs . > trivyfs.txt'
        }
    }
}
