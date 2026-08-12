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
                        
                        # Configure npm timeouts and retry counts for network stability
                        npm config set fetch-retry-mintimeout 20000
                        npm config set fetch-retry-maxtimeout 120000
                        npm config set fetch-timeout 300000
                        npm config set fetch-retries 5

                        # Attempt install; fallback to public mirror if default registry hangs
                        npm ci || (npm config set registry https://registry.npmmirror.com/ && npm ci)
                        
                        npm run build
                    '''
                }
            }
        }

        stage('AI service tests') {
            agent {
                docker {
                    image 'python:3.11-slim'
                    reuseNode true
                }
            }
            steps {
                dir('ai-service') {
                    sh '''
                        set -eux
                        python -m pip install --upgrade pip
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
