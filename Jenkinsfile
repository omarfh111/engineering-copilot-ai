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

        stage('Backend compile and unit test') {
            steps {
                dir('backend') {
                    sh '''
                        set -eux
                        chmod +x ./mvnw
                        ./mvnw -DskipTests package
                        ./mvnw -Dtest=AuditLogServiceImplTest test
                    '''
                }
            }
            post {
                always {
                    junit allowEmptyResults: false, testResults: 'backend/target/surefire-reports/*.xml'
                }
            }
        }

        stage('Frontend build') {
            steps {
                dir('frontend') {
                    sh '''
                        set -eux
                        npm ci
                        npm run build
                    '''
                }
            }
        }

        stage('AI service tests') {
            steps {
                dir('ai-service') {
                    sh '''
                        set -eux
                        python -m pip install -r requirements.txt
                        python -m pytest -q
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Validation completed successfully. Deployment remains a separate, explicitly approved operation.'
        }
        always {
            cleanWs()
        }
    }
}
