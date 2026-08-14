pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    tools {
        nodejs 'NodeJS'
    }

    stages {
        stage('Checkout') {
            steps {
                script {
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
                            timeout: 120
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
                        ./mvnw -DskipTests package -Dmaven.wagon.http.retryHandler.count=5 -Dmaven.wagon.rto=10000 -ntp
                        ./mvnw -Dtest=AuditLogServiceImplTest test -ntp
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
                        
                        pip install --default-timeout=1000 --retries 10 --upgrade pip
                        pip install --default-timeout=1000 --retries 10 -r requirements.txt
                        
                        PYTHONPATH=. pytest -q
                    '''
                }
            }
        }

        stage('Continuous Deployment (CD)') {
            steps {
                echo 'Deploying services locally in background...'
                sh '''
                    set -eux

                    # Tell Jenkins NOT to kill child processes when stage ends
                    export JENKINS_NODE_COOKIE=dontKillMe

                    # 1. Stop old instances
                    pkill -f 'java -jar' || true
                    pkill -f 'uvicorn app.main:app' || true

                    # 2. Deploy AI Service
                    cd ai-service
                    . venv/bin/activate
                    nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > ai_service.log 2>&1 &
                    cd ..

                    # 3. Deploy Spring Boot Backend
                    cd backend
                    nohup java -jar target/*.jar > backend.log 2>&1 &
                    cd ..

                    # Allow 3 seconds for background processes to bind ports
                    sleep 3
                    
                    echo "Services actively running in background!"
                '''
            }
        }
    }

    post {
        success {
            echo 'CI/CD Pipeline executed successfully!'
        }
    }
}
