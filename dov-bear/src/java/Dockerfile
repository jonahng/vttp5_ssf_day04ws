FROM eclipse-temurin:23-jdk

LABEL MAINTAINER ="jonahng"
LABEL description ="This is vttp5 ssf ws 4 java for dockerization"
LABEL name="vttp5_ssf_day04ws_java"

ARG APP_DIR=/APP_DIR


#Directory where source code will stay, and where your project will be copied
WORKDIR ${APP_DIR}

#Copying the required files into the image
COPY pom.xml .
COPY mvnw .
COPY mvnw.cmd .
COPY src src
COPY .mvn .mvn
#.mvn is a hidden folder that contains necessary things to run maven.

#Package the application using the RUN directive and download the dependencies in POM.xml, then compile into jar



RUN chmod a+x ./mvnw 

RUN ./mvnw clean package -Dmaven.test.skip=true

ENV PORT=3000 METRICS_PORT=3100

EXPOSE ${PORT} ${METRICS_PORT}

CMD node main
#NAME comes from the pom.xml artifact id - version .jar