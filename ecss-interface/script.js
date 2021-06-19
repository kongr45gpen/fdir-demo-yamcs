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
const $pmonTable = document.getElementById('pmon-table');

let pmons = {}

createPmonTable = function() {
    $pmonTable.innerHTML = '';

    for (const [pmonId, pmon] of Object.entries(pmons)) {
        var tr = document.createElement('tr');

        var tds = _.map(new Array(8), function (e) { return document.createElement('td')});

        tds[0].appendChild(document.createTextNode(pmonId));
        tds[1].appendChild(document.createTextNode(pmon.parameter));
        tds[1].classList.add("table-parameter");

        if (pmon.validity) {
            var lis = _.map(new Array(2), function (e) { return document.createElement('p')});
            lis[0].appendChild(document.createTextNode(pmon.validity.parameter));
            lis[1].appendChild(document.createTextNode(pmon.validity.value));
            lis[1].appendChild(document.createElement('span'));
            lis[1].childNodes[1].classList.add('mdl-chip');
            lis[1].childNodes[1].classList.add('mdl-chip-table');
            lis[1].childNodes[1].appendChild(document.createElement('code'));
            lis[1].childNodes[1].childNodes[0].classList.add('mdl-chip__text');
            lis[1].childNodes[1].childNodes[0].appendChild(document.createTextNode(pmon.validity.mask))
            tds[2].appendChild(lis[0]);
            tds[2].appendChild(lis[1]);
        }

        tds[3].appendChild(document.createTextNode(pmon.monitoring_interval));
        tds[4].appendChild(document.createTextNode(pmon.status));

        if (pmon.status == "Invalid") {
            tds[4].style.color = "#ff8f00";
            tds[4].style.fontWeight = "600";
        } else if (pmon.status != "OK") {
            tds[4].style.color = "#c62828";
            tds[4].style.fontWeight = "600";
        }

        tds[5].appendChild(document.createTextNode(pmon.repetition_number));

        if (pmon.check_type == "Limit_Check") {
            nodes = []
            nodes[0] = document.createElement('p');
            nodes[0].appendChild(document.createTextNode(pmon.check.low + " ≤ " + "x" + " ≤ " + pmon.check.high))
            nodes[1] = document.createElement('span');
            nodes[1].classList.add('mdl-chip');
            nodes[1].classList.add('mdl-chip-long');
            nodes[1].appendChild(document.createElement('span'));
            nodes[1].childNodes[0].classList.add('mdl-chip__text');
            nodes[1].childNodes[0].appendChild(document.createTextNode(pmon.check.low_event))
            nodes[2] = document.createElement('span');
            nodes[2].classList.add('mdl-chip');
            nodes[2].classList.add('mdl-chip-long');
            nodes[2].appendChild(document.createElement('span'));
            nodes[2].childNodes[0].classList.add('mdl-chip__text');
            nodes[2].childNodes[0].appendChild(document.createTextNode(pmon.check.high_event))

            tds[6].appendChild(nodes[0])
            tds[6].appendChild(nodes[1])
            tds[6].appendChild(nodes[2])
        } else {
            nodes = []
            nodes[0] = document.createElement('p');
            nodes[0].appendChild(document.createTextNode("x" + " = " + pmon.check.value))
            nodes[1] = document.createElement('span');
            nodes[1].classList.add('mdl-chip');
            nodes[1].classList.add('mdl-chip-table');
            nodes[1].appendChild(document.createElement('span'));
            nodes[1].childNodes[0].classList.add('mdl-chip__text');
            nodes[1].childNodes[0].appendChild(document.createTextNode(pmon.check.mask))
            nodes[0].appendChild(nodes[1]);
            nodes[2] = document.createElement('span');
            nodes[2].classList.add('mdl-chip');
            nodes[2].classList.add('mdl-chip-long');
            nodes[2].appendChild(document.createElement('span'));
            nodes[2].childNodes[0].classList.add('mdl-chip__text');
            nodes[2].childNodes[0].appendChild(document.createTextNode(pmon.check.event))

            tds[6].appendChild(nodes[0])
            tds[6].appendChild(nodes[2])
        }

        tds[7].appendChild(document.createTextNode(pmon.date))

        for (const td of Object.values(tds)) {
            tr.appendChild(td);
        }

        $pmonTable.appendChild(tr);
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
                "event": check("Event_Definition_ID").stringValue
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
            "check": checkData,
            "check_type": monitoring("Check_Type").stringValue,
            "date": monitoringRaw.generationTime
        }

        createPmonTable();
    }
}