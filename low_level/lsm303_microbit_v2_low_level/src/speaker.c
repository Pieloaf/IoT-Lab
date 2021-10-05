#include <device.h>
#include <drivers/gpio.h>
#define SPEAKER_PORT_BIT 0
static const struct device *gpio0;

int speaker_begin()
{
    int ret;
    gpio0 = device_get_binding("GPIO_0");
    if (gpio0 == NULL)
    {
        printf("Error acquiring GPIO 0 interface\n");
        return -1;
    }
    ret = gpio_pin_configure(gpio0, SPEAKER_PORT_BIT, GPIO_OUTPUT);

    return ret;
}

void playsound()
{
    gpio_pin_set(gpio0, SPEAKER_PORT_BIT, 1);
}