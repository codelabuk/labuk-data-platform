#  spark-codelabuk:latest

FROM apache/spark:3.5.3

USER root

# Add S3A support
RUN curl -L -o /opt/spark/jars/hadoop-aws-3.3.4.jar \
    https://repo1.maven.org/maven2/org/apache/hadoop/hadoop-aws/3.3.4/hadoop-aws-3.3.4.jar && \
    curl -L -o /opt/spark/jars/aws-java-sdk-bundle-1.12.262.jar \
    https://repo1.maven.org/maven2/com/amazonaws/aws-java-sdk-bundle/1.12.262/aws-java-sdk-bundle-1.12.262.jar && \
    curl -L -o /opt/spark/jars/iceberg-spark-runtime-3.5_2.12-1.5.0.jar \
    https://repo1.maven.org/maven2/org/apache/iceberg/iceberg-spark-runtime-3.5_2.12/1.5.0/iceberg-spark-runtime-3.5_2.12-1.5.0.jar && \
    curl -L -o /opt/spark/jars/spark-sql-kafka-0-10_2.12-3.5.3.jar \
    https://repo1.maven.org/maven2/org/apache/spark/spark-sql-kafka-0-10_2.12/3.5.3/spark-sql-kafka-0-10_2.12-3.5.3.jar && \
    curl -L -o /opt/spark/jars/kafka-clients-3.6.0.jar \
    https://repo1.maven.org/maven2/org/apache/kafka/kafka-clients/3.6.0/kafka-clients-3.6.0.jar && \
    curl -L -o /opt/spark/jars/commons-pool2-2.12.0.jar \
    https://repo1.maven.org/maven2/org/apache/commons/commons-pool2/2.12.0/commons-pool2-2.12.0.jar && \
    curl -L -o /opt/spark/jars/spark-token-provider-kafka-0-10_2.12-3.5.3.jar \
    https://repo1.maven.org/maven2/org/apache/spark/spark-token-provider-kafka-0-10_2.12/3.5.3/spark-token-provider-kafka-0-10_2.12-3.5.3.jar && \
    curl -L -o /opt/spark/jars/delta-spark_2.12-3.2.1.jar \
    https://repo1.maven.org/maven2/io/delta/delta-spark_2.12/3.2.1/delta-spark_2.12-3.2.1.jar && \
    curl -L -o /opt/spark/jars/delta-storage-3.2.1.jar \
    https://repo1.maven.org/maven2/io/delta/delta-storage/3.2.1/delta-storage-3.2.1.jar

RUN mkdir -p /home/spark/.ivy2/cache && \
    chown -R spark:spark /home/spark/.ivy2

USER spark
