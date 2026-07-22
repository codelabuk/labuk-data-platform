from pyspark.sql import *
from pyspark.sql.connect.functions import dense_rank


def main():
    spark = SparkSession.builder.appName("Sol2").getOrCreate()
    df_stream  = spark.readStream.schema("id INT, value STRING").csv("s3://bucket-name/path/to/file")
    data =[{"cust1", "2023-12-01", 100}, {"cust2", "2023-12-01", 150},
           {"cust1", "2023-12-01", 200}, {"cust2", "2023-12-01", 250}]

    columns = ["product_id", "date", "sales"]

    df = df_stream.fillna({'category':'NA'})

    df = df.groupBy('user_id').agg(sum('actions').alias('total_Actions')).orderBy('total_actions', ascending=False).limit(5)
    df.show()

    df = df.withColumn('flag', dense_rank().over(Window.partitionBy('customer_id').orderBy(col('total_Actions').desc())))



if __name__ == '__main__':
    main()