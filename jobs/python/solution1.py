from pyspark.sql import SparkSession
from pyspark.sql.functions import *

def main():
    spark = SparkSession.builder.appName("Sol1").getOrCreate()

    data =[{"101", "2023-12-01", 100}, {"101", "2023-12-01", 150},
           {"102", "2023-12-01", 200}, {"102", "2023-12-01", 250}]

    columns = ["product_id", "date", "sales"]

    df = spark.createDataFrame(data, columns)
    df.show()
    df = df.withColumn("date", col("date").cast(DateType()))
    df = df.withColumn("date", to_date(col("date")))
    df = df.orderBy("product_id","date", ascending= [1, 0]).dropDuplicates(subset=["product_id"])
    df.show()

if __name__ == "__main__":
    main()