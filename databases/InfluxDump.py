from influxdb import InfluxDBClient
import json

client = InfluxDBClient("localhost", database="IMicrobit")
measurement = "sensor_data"
db_data = client.query("select * from %s" % (measurement))


data_to_write = [
    {
        "tags": {
            "device_ID": d["device_ID"],
            "device_name": d["device_name"],
            "room": d["room"],
            "sensor_ID": d["sensor_ID"],
            "sensor_name": d["sensor_name"],
        },
        "time": d["time"],
        "fields": {"value": int(d["value"])},
    }
    for d in db_data.get_points()
]

with open("IMicrobit.json", "w") as f:
    json.dump(data_to_write, f)
