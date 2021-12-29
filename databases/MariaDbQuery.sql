select
  device_name,
  sensor_name,
  value,
  units,
  timestamp
from
  (
    select
      device_id,
      sensor_name,
      units,
      value,
      timestamp
    from
      sensors s
      left join sensor_data sd on s.sensor_id = sd.sensor_id
  ) as sensors
  left join devices d on sensors.device_id = d.device_id
where
  value is not null