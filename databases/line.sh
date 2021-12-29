startTime=1609491600000000000 # nanosecond epoch time 2021-01-01 09:00:00
inc=1000000000 # nanosecond to second

for i in {0..3}
do
    startTime=$(($startTime + $inc))
    curl -i -XPOST "http://127.0.0.1:8086/write?db=IMicrobit" --data-binary "sensor_data,room=$ROOM,device_name=Beep\ Boop\ C02,device_ID=1,sensor_ID=00000001-0002-0003-0004-000000000001,sensor_name=CO2 value=$((950 + $RANDOM % 30)) $startTime"
done
