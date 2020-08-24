wip:wd's openzwave backend
===========================


We are essentially creating a nodejs backend for an openzwave frontend
dashboard, fed by the ozw-mqtt-gateway.

This backend does not consume openzwave directly, but instead consumes mqtt
events emitted by the mqtt gateway. This is our way of splitting the stack in
multiple independent pieces: the mqtt gateway is, essentially, the driver,
which can be independently used by multiple consumer applications, including
this backend; the backend, in turn, can be as smart or as dumb as it needs to
be to feed the frontend dashboard, without affecting other applications that
might be feeding off of the mqtt gateway.

The only drawback of this approach is that we need to ensure that we are not
colliding state with other consumer/producers relying on the gateway; however,
because at the moment we are the only consumer/producer, we are assuming that
to be the status quo for the foreseeable future, and won't be implementing any
particular mitigations for simplicity's sake. However, given mqtt is
event-driven by nature, we might not even have to do any mitigation strategies
aside from a few corner cases.


LICENSE
-------

This work is licensed under the European Public License v1.2 (EUPL-1.2), as
published by the European Commission. This repository contains a copy of the
license (see LICENSE) in full.

