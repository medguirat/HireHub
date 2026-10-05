# syntax=docker/dockerfile:1
# HireHub backend: Spring Boot on Java 17. Build stage compiles the jar, runtime stage only has a JRE.

FROM eclipse-temurin:17-jdk AS build
WORKDIR /src
# Dependencies first, so they stay cached while only the code changes.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw && ./mvnw --batch-mode --no-transfer-progress dependency:go-offline
COPY src/ src/
RUN ./mvnw --batch-mode --no-transfer-progress package -DskipTests \
    && cp target/hirehub-backend-*.jar /app.jar

FROM eclipse-temurin:17-jre
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --home-dir /app hirehub \
    && mkdir -p /data/uploads /data/cv-store \
    && chown -R hirehub /data
WORKDIR /app
COPY --from=build /app.jar app.jar
USER hirehub
# Files live in /data (a volume): public images and private CVs survive a new image.
ENV SPRING_PROFILES_ACTIVE=prod \
    APP_PUBLIC_UPLOAD_DIR=/data/uploads \
    CV_STORAGE_DIR=/data/cv-store \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
EXPOSE 8081
# Ready = the database answers (the ai-service is not required to serve the app).
HEALTHCHECK --interval=10s --timeout=3s --start-period=90s --retries=6 \
    CMD curl -fsS http://localhost:8081/actuator/health/readiness || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
