pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    // Prevent Git clone timeout, HTTP/2 stream errors, and RPC buffer issues on slow connections
                    sh '''
                        git config --global http.postBuffer 1048576000
                        git config --global http.version HTTP/1.1
                        git config --global http.lowSpeedLimit 1000
                        git config --global http.lowSpeedTime 300
                    '''
                }
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: 'sprint4']],
                    userRemoteConfigs: [[url: 'https://github.com/omarfh111/engineering-copilot-ai.git']],
                    extensions: [
                        [
                            $class: 'CloneOption', 
                            depth: 1, 
                            noTags: true, 
                            reference: '', 
                            shallow: true, 
                            timeout: 120 // Increased timeout to handle network stalls
                        ]
                    ]
                ])
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
                        
                        npm config set fetch-retry-mintimeout 20000
                        npm config set fetch-retry-maxtimeout 120000
                        npm config set fetch-timeout 300000
                        npm config set fetch-retries 5

                        npm ci || (npm config set registry https://registry.npmmirror.com/ && npm ci)
                        
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
                        python3 -m venv venv
                        . venv/bin/activate
                        
                        # Added timeouts and retries for pip to handle slow Wi-Fi connection
                        pip install --default-timeout=1000 --retries 10 --upgrade pip
                        pip install --default-timeout=1000 --retries 10 -r requirements.txt
                        
                        pytest -q
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Validation completed successfully. Deployment remains a separate, explicitly approved operation.'
        }
    }
}
