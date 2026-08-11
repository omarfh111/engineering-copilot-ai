pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend Tests & Package') {
            steps {
                dir('backend') {
                    sh '''
                        set -euxo pipefail
                        chmod +x ./mvnw
                        ./mvnw clean test package -DskipTests=false
                    '''
                }
            }
            post {
                always {
                    junit allowEmptyResults: false, testResults: 'backend/target/surefire-reports/*.xml'
                }
            }
        }

        stage('Frontend Build') {
            steps {
                dir('frontend') {
                    sh '''
                        set -euxo pipefail
                        npm ci
                        npm run build
                    '''
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    set -euxo pipefail
                    docker compose build
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    set -euxo pipefail
                    docker compose down
                    docker compose up -d
                '''
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully. engineering-copilot-ai is built and deployed.'
        }
        failure {
            echo 'Pipeline failed. Review the stage logs and archived test results for details.'
        }
        always {
            cleanWs()
        }
    }
}
