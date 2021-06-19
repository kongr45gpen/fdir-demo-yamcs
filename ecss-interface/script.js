console.log("hello");

const Parameters = [
    "Temp. 1",
    "Temp. 2",
    "Temp. Δ",
    "Temp. 1 Status",
    "Temp. 2 Status",
    "Temp. 1+2 Status",
    "Temp. Internal",
    "Tick time"
]

var timeRequest = {
    "type": "time",
    "id": 1,
    "options": {
      "instance": "fdirdemo"
    }
  }

var parameterRequest = {
    "type": "parameters",
    "id": 2,
    "options": {
        "instance": "fdirdemo",
        "processor": "realtime",
        "id": [
            { name: "/fdirdemo/PMON_Monitoring_Definition"},
            { name: "/fdirdemo/PMON_Limit_Check_Double"},
            { name: "/fdirdemo/PMON_Limit_Check_Float"},
            { name: "/fdirdemo/PMON_Expected_Value_Check_uint64"},
            { name: "/fdirdemo/PMON_Expected_Value_Check_Temperature_Status"},
        ]
    }
}

var websocket = new WebSocket("ws://localhost:8090/api/websocket")

websocket.onopen = function (event) {
    websocket.send(JSON.stringify(timeRequest));
    websocket.send(JSON.stringify(parameterRequest));
}

const $timestamp = document.getElementById('timestamp');

let pmons = {}

createPmonTable = function() {
    for (const [pmonId, pmon] of Object.entries(pmons)) {

    }
}

websocket.onmessage = function (event) {
    var json = JSON.parse(event.data);
    console.log(json);

    if (json.type == "time") {
        $timestamp.innerText = json.data.value;
    } else if (json.type == "parameters") {
        var monitoringRaw = _.find(json.data.values, {'numericId': 1});
        var checkRaw = _.find(json.data.values, function(e) { return e.numericId != 1 });

        monitoring = function(key) {
            var index = _.findIndex(monitoringRaw.engValue.aggregateValue.name, function(e) { return e == key })

            return monitoringRaw.engValue.aggregateValue.value[index];
        }

        check = function(key) {
            var index = _.findIndex(checkRaw.engValue.aggregateValue.name, function(e) { return e == key })

            return checkRaw.engValue.aggregateValue.value[index];
        }

        if (check("Mask") !== undefined) {
            checkData = {
                "mask": "0x" + check("Mask").uint32Value.toString(16),
                "value": check("Expected_Value").stringValue ? check("Expected_Value").stringValue : check("Expected_Value").uint32Value,
                "event": check("Event_Definition_ID")
            }
        } else {
            checkData = {
                "low": check("Low_Limit").floatValue,
                "low_event": check("Low_Event").stringValue,
                "high": check("High_Limit").floatValue,
                "high_event": check("High_Event").stringValue
            }
        }

        pmons[monitoring("PMON_ID").uint32Value] = {
            "parameter": Parameters[monitoring("Monitored_Parameter_ID").uint32Value],
            "validity": Parameters[monitoring("Mask").uint32Value] == 0 ? null : {
                "parameter": Parameters[monitoring("Validity_Parameter_ID").uint32Value],
                "mask": "0x" + monitoring("Mask").uint32Value.toString(16),
                "value": monitoring("Expected_Value").uint32Value,
            },
            "monitoring_interval": monitoring("Monitoring_Interval").uint32Value + " ms",
            "status": monitoring("Check_Status").stringValue,
            "repetition_number": monitoring("Repetition_Number").uint32Value,
            "check": checkData
        }

        console.log(pmons);
    }
}