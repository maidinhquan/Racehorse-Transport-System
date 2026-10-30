"""Generate Flow 3 v2 target contracts only; no server/DB/live provider operations."""
from pathlib import Path
import copy
import json
import re

ROOT = Path(__file__).resolve().parent
S = {}
OPS = []


def st(example='Thông tin', **kw):
    return dict(type='string', example=example, **kw)


def integer(example=1, minimum=0, maximum=9007199254740991):
    return dict(type='integer', minimum=minimum, maximum=maximum, example=example)


def num(example=1, minimum=0, maximum=100000):
    return dict(type='number', minimum=minimum, maximum=maximum, example=example)


def enum(*values):
    return st(values[0], enum=list(values))


def obj(props, optional=()):
    return dict(type='object', properties=props, required=[k for k in props if k not in optional], additionalProperties=False)


def arr(items, minimum=0, maximum=100):
    return dict(type='array', items=items, minItems=minimum, maxItems=maximum)


def ref(name):
    return {'$ref': '#/components/schemas/' + name}


def nullable(schema):
    return {'anyOf': [schema, {'type': 'null'}]}


def define(name, props, optional=()):
    S[name] = obj(props, optional)
    return ref(name)


def ident(prefix, n=1):
    return st(f'{prefix}_{n:03}', pattern=f'^{prefix}_\\d{{3,}}$', maxLength=50)


def opaque(example='PLACE_001'):
    return st(example, minLength=1, maxLength=100, pattern=r'^[A-Za-z0-9_-]+$')


boolean = {'type': 'boolean', 'example': True}
yes = {'type': 'boolean', 'const': True, 'example': True}
v = integer(1, 1)
stamp = st('2026-11-10 06:00', pattern=r'^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d$')
short = st('Thông tin đã xác minh', minLength=1, maxLength=255, pattern=r'\S')
note = st('Đã kiểm tra và xác nhận phương án', minLength=5, maxLength=2000, pattern=r'\S')
country = st('VN', pattern=r'^[A-Z]{2}$')
optional_note = st('', maxLength=2000)
money = integer(105000000)
mode = enum('ROAD', 'AIR')
leg_key = enum('road', 'outbound', 'inbound')
place_functions = arr(enum('REST', 'FUEL', 'QUARANTINE', 'BORDER', 'AIRPORT'), 1, 5)
place_functions['uniqueItems'] = True

define('Actor', {'userId': ident('USER'), 'name': short})
define('Blocker', {'code': st('RESOURCE_CONFLICT'), 'field': st('resources.road.vehicleId'), 'message': st('Xe đã được giữ cho chuyến khác')})
define('Error', {'success': {'type': 'boolean', 'const': False}, 'message': short, 'errorCode': st('RESOURCE_CONFLICT'),
                 'data': {'type': 'null'}, 'blockers': arr(ref('Blocker')), 'errors': {'type': 'object', 'additionalProperties': arr(st())}}, ('blockers', 'errors'))
define('Binding', {'version': integer(10, 1), 'contextVersion': v, 'planVersion': nullable(v)})
define('Expected', {'expectedVersion': integer(10, 1)})
define('PlanCommand', {'expectedVersion': integer(10, 1), 'planVersion': v})
define('ReasonCommand', {'expectedVersion': integer(10, 1), 'reason': note})
define('Policy', {'version': v, 'label': st('Đề xuất cho đồ án — cấu hình được'), 'careIntervalH': num(4, .01),
                  'shortRestMin': integer(45, 1), 'roadEpisodeH': num(12, .01), 'recoveryRestH': num(8, .01),
                  'truckFactor': num(1.2, .01), 'airportHandoverH': num(3, .01), 'airportReceiveH': num(2, .01),
                  'pickupHandoverMin': integer(30, 1), 'maxEndpointSnapM': integer(250, 1)})
define('Capabilities', {'version': {'type': 'string', 'const': '2.0.0'}, 'implementationStatus': enum('DESIGNED_NOT_IMPLEMENTED', 'AVAILABLE'),
                        'parallelPreparation': yes, 'documentValidityMode': enum('ASSUMED_VALID_FOR_TRIP'),
                        'feasibilityRequired': {'type': 'boolean', 'const': False}, 'timedDocumentsGate': {'type': 'boolean', 'const': False},
                        'roadConfirmBeforeSubmit': yes, 'airConfirmAfterBooking': yes, 'demoEnabled': {'type': 'boolean', 'example': False},
                        'routingAvailable': {'type': 'boolean', 'example': False}, 'truckRoutingAvailable': {'type': 'boolean', 'example': False},
                        'persistenceAvailable': {'type': 'boolean', 'example': False}, 'policy': nullable(ref('Policy')),
                        'currency': {'type': 'string', 'const': 'VND'}, 'timezone': {'type': 'string', 'const': 'Asia/Ho_Chi_Minh'},
                        'maxHorses': integer(4, 4, 4), 'maxUploadBytes': integer(10485760, 10485760, 10485760)})
define('Geo', {'lat': num(10.7769, -90, 90), 'lng': num(106.7009, -180, 180)})
define('AccessLimits', {'maxHeightM': num(4.2, .01), 'maxWidthM': num(3, .01), 'maxLengthM': num(12, .01),
                        'maxWeightT': num(18, .01), 'note': optional_note}, ('maxHeightM', 'maxWidthM', 'maxLengthM', 'maxWeightT', 'note'))
define('Endpoint', {'name': short, 'address': st('Địa chỉ nhận ngựa theo hợp đồng'), 'country': country, 'geo': ref('Geo'),
                    'access': nullable(ref('AccessLimits'))})
define('RestFacilities', {'truckParking': boolean, 'onboardCare': boolean, 'waterFeed': boolean, 'loadingArea': boolean,
                         'stabling': boolean, 'capacity': integer(4, 1, 10000)})
define('FuelFacilities', {'fuels': st('Diesel', minLength=1, maxLength=100), 'heavyAccess': boolean})
define('AirportFacilities', {'iata': st('SGN', pattern=r'^[A-Z]{3}$'), 'horseHandling': boolean})
define('PlaceService', {'kind': short, 'capacity': short})
place_props = {'name': st('Cơ sở nghỉ chăm sóc ngựa', minLength=3, maxLength=255), 'country': country, 'province': short,
               'address': short, 'geo': ref('Geo'), 'functions': place_functions,
               'hours': st('24/7', pattern=r'^(?:24/7|(?:[01]\d|2[0-3]):[0-5]\d[–-](?:[01]\d|2[0-3]):[0-5]\d)$'),
               'contact': short, 'phone': st('+84901234567', maxLength=50), 'notes': optional_note,
               'rest': nullable(ref('RestFacilities')), 'fuel': nullable(ref('FuelFacilities')),
               'airport': nullable(ref('AirportFacilities')), 'service': nullable(ref('PlaceService'))}
define('Place', {'id': opaque(), 'version': v, **place_props, 'status': enum('ACTIVE', 'SUSPENDED', 'INACTIVE'), 'sample': boolean, 'updatedAt': stamp})
define('PlaceInput', place_props)
define('PlaceUpdate', {'expectedVersion': v, **place_props})
define('PlaceStatus', {'expectedVersion': v, 'status': enum('ACTIVE', 'SUSPENDED', 'INACTIVE'), 'reason': note})
define('Deleted', {'id': opaque(), 'deleted': yes})
define('VehicleSpec', {'heightM': num(3.8, .01), 'widthM': num(2.5, .01), 'lengthM': num(10, .01), 'grossT': num(18, .01)})
define('TruckProfile', {'vehicleId': ident('VEHICLE'), 'heightM': num(3.8, .01), 'widthM': num(2.5, .01), 'lengthM': num(10, .01),
                        'currentT': num(12, .01), 'grossT': num(18, .01), 'axleT': num(4, .01)})
define('VehicleOption', {'id': ident('VEHICLE'), 'plate': st('51C-12345'), 'stalls': integer(4, 1), 'country': country,
                         'status': enum('READY', 'MAINTENANCE', 'INACTIVE'), 'spec': nullable(ref('VehicleSpec')),
                         'eligible': boolean, 'blockers': arr(ref('Blocker')), 'assignedTrips': arr(ident('TRIP'))})
define('Staff', {'id': ident('USER', 8), 'version': v, 'name': short, 'phone': short, 'country': country,
                 'position': enum('DRIVER', 'VETERINARIAN', 'ESCORT'), 'status': enum('ACTIVE', 'ON_LEAVE', 'INACTIVE'),
                 'licence': nullable(short), 'certExpiry': nullable(st('2027-12-31', pattern=r'^\d{4}-\d{2}-\d{2}$')),
                 'assignedTrips': arr(ident('TRIP')), 'eligible': boolean, 'blockers': arr(ref('Blocker'))})
define('StaffStatus', {'expectedVersion': v, 'status': enum('ACTIVE', 'ON_LEAVE', 'INACTIVE'), 'reason': note}, ('reason',))
define('Crew', {'MAIN_DRIVER': nullable(ident('USER', 8)), 'CO_DRIVER': nullable(ident('USER', 9)), 'VETERINARIAN': nullable(ident('USER', 10))})
define('RoadResources', {'leg': leg_key, 'vehicleId': nullable(ident('VEHICLE')), 'crew': ref('Crew'), 'truckProfile': nullable(ref('TruckProfile'))})
define('StopInput', {'clientKey': opaque('stop-origin'), 'type': enum('ORIGIN', 'DESTINATION', 'REST_STOP', 'FUEL_STOP', 'CHECKPOINT', 'QUARANTINE_STATION', 'AIRPORT'),
                    'placeId': nullable(opaque()), 'purposes': arr(enum('REST', 'FUEL', 'QUARANTINE', 'BORDER', 'AIRPORT'), 0, 5),
                    'dwellMin': integer(0, 0, 1440), 'unload': boolean, 'careNote': optional_note})
define('Stop', {'stopId': opaque('STOP_001'), **S['StopInput']['properties'], 'name': short, 'geo': ref('Geo'), 'required': boolean,
                'arriveAt': stamp, 'departAt': stamp, 'placeVersion': nullable(v)})
define('ReadyStamp', {'valid': boolean, 'planVersion': nullable(v), 'contextVersion': v, 'by': ref('Actor'), 'at': stamp,
                      'invalidatedReason': nullable(short)})
define('PartnerInput', {'name': st('Equus Air Charter', minLength=3, maxLength=255), 'contact': short,
                        'email': st('booking@equusair.example', maxLength=254), 'phone': short, 'services': short})
define('Partner', {'id': opaque('PARTNER_001'), 'version': v, **S['PartnerInput']['properties'],
                   'status': enum('ACTIVE', 'INACTIVE'), 'sample': boolean, 'updatedAt': stamp})
define('PartnerUpdate', {'expectedVersion': v, **S['PartnerInput']['properties']})
define('PartnerStatus', {'expectedVersion': v, 'status': enum('ACTIVE', 'INACTIVE'), 'reason': note}, ('reason',))
define('FlightService', {'serviceId': opaque('SERVICE_001'), 'catalogVersion': v, 'partnerId': opaque('PARTNER_001'), 'partnerName': short,
                         'providerFlightCode': st('EQA-DEMO-01', minLength=1, maxLength=100), 'flightNo': st('EQA 7710'),
                         'fromAirportId': opaque('AIRPORT_001'), 'toAirportId': opaque('AIRPORT_002'),
                         'fromCountry': country, 'toCountry': st('JP', pattern=r'^[A-Z]{2}$'),
                         'departLocal': st('2026-11-10 15:00', pattern=stamp['pattern']), 'departZone': st('Asia/Ho_Chi_Minh'),
                         'arriveLocal': st('2026-11-10 22:30', pattern=stamp['pattern']), 'arriveZone': st('Asia/Tokyo'),
                         'departAt': st('2026-11-10 15:00', pattern=stamp['pattern']), 'arriveAt': st('2026-11-10 20:30', pattern=stamp['pattern']),
                         'capacity': integer(4, 1), 'costVnd': money, 'currency': {'type': 'string', 'const': 'VND'},
                         'careIncluded': boolean, 'direct': yes, 'status': enum('AVAILABLE', 'UNAVAILABLE'), 'sample': boolean,
                         'eligible': boolean, 'blockers': arr(ref('Blocker'))})
define('FlightSelection', {'serviceId': opaque('SERVICE_001'), 'catalogVersion': v, 'partnerId': opaque('PARTNER_001'),
                           'providerFlightCode': st('EQA-DEMO-01', minLength=1, maxLength=100), 'careAcknowledged': yes})
define('FlightSelectInput', {'expectedVersion': integer(10, 1), **S['FlightSelection']['properties']})
define('FlightProposal', {'flightVersion': v, 'status': enum('DRAFT', 'BUDGET_PENDING', 'BUDGET_APPROVED', 'REJECTED', 'BOOKED'),
                          'service': ref('FlightService'), 'careAcknowledged': boolean})
define('File', {'fileId': opaque('FILE_001'), 'fileName': st('booking.pdf', minLength=1, maxLength=255),
                'contentType': enum('application/pdf', 'image/jpeg', 'image/png'), 'size': integer(2048, 1, 10485760),
                'uploadedAt': stamp, 'uploadedBy': ref('Actor')})
define('Booking', {'bookingId': integer(1, 1, 2147483647), 'planVersion': v, 'flightVersion': v, 'partnerId': opaque('PARTNER_001'),
                   'bookingRef': st('EQA-BOOK-001', minLength=4, maxLength=100), 'confirmedHorses': integer(2, 1, 4),
                   'source': enum('PARTNER_REFERENCE', 'DEMO'), 'status': enum('BOOKED', 'CANCELLED'),
                   'evidenceFileId': nullable(opaque('FILE_001')), 'recordedAt': stamp, 'recordedBy': ref('Actor')})
define('BookingInput', {'expectedVersion': integer(10, 1), 'planVersion': v, 'flightVersion': v,
                        'bookingRef': st('EQA-BOOK-001', minLength=4, maxLength=100), 'confirmedHorses': integer(2, 1, 4),
                        'acknowledged': yes, 'source': enum('PARTNER_REFERENCE', 'DEMO'), 'note': optional_note,
                        'evidenceFileId': nullable(opaque('FILE_001'))})
define('CancelBookingInput', {'expectedVersion': integer(10, 1), 'bookingId': integer(1, 1, 2147483647),
                              'cancellationRef': short, 'reason': note, 'partnerConfirmed': yes, 'evidenceFileId': nullable(opaque('FILE_001'))})
define('RoutingSegment', {'fromStopKey': opaque('stop-origin'), 'toStopKey': opaque('stop-destination'), 'leg': leg_key,
                          'km': num(20, 0), 'driveMin': num(30, 0),
                          'geometry': arr(arr(num(10.77, -180, 180), 2, 2), 2, 300000)})
define('Routing', {'routingId': opaque('ROUTING_001'), 'planVersion': v, 'policyVersion': v,
                   'provider': enum('HERE_TRUCK', 'OSRM', 'DEMO'), 'truckVerified': boolean, 'demo': {'type': 'boolean', 'example': False},
                   'checkedAt': stamp, 'segments': arr(ref('RoutingSegment'), 1, 99), 'stops': arr(ref('Stop'), 2, 100),
                   'totalKm': num(20), 'driveMin': num(30), 'stopMin': num(0), 'flyMin': num(0), 'eta': st('2026-11-10 06:30', pattern=stamp['pattern']),
                   'issues': arr(ref('Blocker'))})
define('RoutingInput', {'expectedVersion': integer(10, 1), 'planVersion': v})
define('PickupAccess', {'result': enum('ACCESSIBLE', 'INACCESSIBLE'), 'proof': st('Đã khảo sát và đối chiếu kích thước xe', minLength=8, maxLength=2000),
                        'valid': boolean, 'by': ref('Actor'), 'at': stamp})
define('AccessInput', {'expectedVersion': integer(10, 1), 'result': enum('ACCESSIBLE', 'INACCESSIBLE'),
                       'proof': st('Đã khảo sát và đối chiếu kích thước xe', minLength=8, maxLength=2000), 'acknowledged': yes})
define('Consent', {'channel': enum('PHONE', 'EMAIL', 'WRITTEN'), 'note': st('Khách đồng ý tự đưa ngựa đến điểm tiếp nhận lúc đã hẹn', minLength=10, maxLength=2000),
                   'recordedBy': ref('Actor'), 'at': stamp})
define('PickupRelocation', {'relocationId': opaque('MEETING_001'), 'status': enum('PROPOSED', 'MANAGER_APPROVED', 'CUSTOMER_CONFIRMED', 'REJECTED'),
                           'placeSnapshot': ref('Place'), 'reason': note, 'handoverAt': stamp, 'customerConsent': nullable(ref('Consent')),
                           'valid': boolean, 'by': ref('Actor'), 'at': stamp})
define('PickupCandidate', {'place': ref('Place'), 'straightLineKm': nullable(num(5)), 'eligible': boolean, 'blockers': arr(ref('Blocker'))})
define('PickupProposalInput', {'expectedVersion': integer(10, 1), 'placeId': opaque(), 'placeVersion': v,
                              'reason': st('Lối vào hẹp, khách đưa ngựa đến cơ sở đã liên hệ', minLength=10, maxLength=2000),
                              'handoverAt': stamp, 'facilityConfirmed': yes})
define('PickupDecisionInput', {'expectedVersion': integer(10, 1), 'relocationId': opaque('MEETING_001'),
                              'decision': enum('APPROVE', 'RETURN'), 'reason': note})
define('ConsentInput', {'expectedVersion': integer(10, 1), 'relocationId': opaque('MEETING_001'), 'placeVersion': v,
                        'channel': enum('PHONE', 'EMAIL', 'WRITTEN'), 'note': S['Consent']['properties']['note'], 'acknowledged': yes})
define('Plan', {'planVersion': v, 'status': enum('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'RETURNED', 'WITHDRAWN', 'SUPERSEDED'),
                'mode': mode, 'plannedDepart': stamp, 'eta': nullable(st('2026-11-10 06:30', pattern=stamp['pattern'])),
                'stops': arr(ref('Stop'), 0, 100), 'resources': arr(ref('RoadResources'), 0, 2),
                'flight': nullable(ref('FlightProposal')), 'routing': nullable(ref('Routing')), 'note': optional_note})
define('PlanDraftInput', {'expectedVersion': integer(10, 1), 'plannedDepart': nullable(stamp), 'stops': arr(ref('StopInput'), 0, 100),
                          'resources': arr(ref('RoadResources'), 0, 2), 'note': optional_note})
define('PlanDecisionInput', {'expectedVersion': integer(10, 1), 'planVersion': v, 'decision': enum('APPROVE', 'RETURN'), 'reason': note}, ('reason',))
define('Validation', {'binding': ref('Binding'), 'planVersion': v, 'valid': boolean, 'blockers': arr(ref('Blocker')),
                      'eta': nullable(st('2026-11-10 06:30', pattern=stamp['pattern'])), 'resourceHoldsCreated': {'type': 'boolean', 'const': False}})
define('DocumentSummary', {'requirementSetApplied': boolean, 'required': integer(5, 0), 'approved': integer(5, 0),
                           'insuranceStatus': enum('VERIFIED', 'PENDING', 'MISSING'), 'quarantineConfirmed': boolean,
                           'validityMode': enum('ASSUMED_VALID_FOR_TRIP'), 'blockers': arr(ref('Blocker'))})
define('Context', {'tripId': ident('TRIP'), 'requestId': ident('REQUEST'), 'contractId': ident('CONTRACT'),
                   'status': enum('PLANNING', 'READY_TO_DEPART', 'IN_TRANSIT', 'COMPLETED'), 'mode': mode, 'binding': ref('Binding'),
                   'deployment': enum('CONFIRMED', 'AWAITING_DEPLOYMENT', 'ON_HOLD'), 'specialistId': ident('USER', 6), 'coordinatorId': ident('USER', 7),
                   'horseIds': {**arr(ident('HORSE'), 1, 4), 'uniqueItems': True}, 'pickup': ref('Endpoint'), 'delivery': ref('Endpoint'),
                   'deliveryDeadline': st('2026-11-12 18:00', pattern=stamp['pattern']), 'draft': nullable(ref('Plan')), 'approvedPlan': nullable(ref('Plan')),
                   'resourcesConfirmed': nullable(ref('ReadyStamp')), 'opsReady': nullable(ref('ReadyStamp')), 'docsReady': nullable(ref('ReadyStamp')),
                   'documents': ref('DocumentSummary'), 'pickupAccess': nullable(ref('PickupAccess')), 'pickupRelocation': nullable(ref('PickupRelocation')),
                   'booking': nullable(ref('Booking')), 'blockers': arr(ref('Blocker'))})
define('TripListItem', {'tripId': ident('TRIP'), 'requestId': ident('REQUEST'), 'mode': mode, 'status': enum('PLANNING', 'READY_TO_DEPART', 'IN_TRANSIT', 'COMPLETED'),
                        'planningState': enum('AWAITING_DEPLOYMENT', 'AWAITING_ROUTE', 'MISSING_RESOURCES', 'ROUTE_PENDING', 'ROUTE_RETURNED', 'PLANNED', 'READY'),
                        'plannedDepart': nullable(stamp), 'eta': nullable(stamp), 'deliveryDeadline': stamp, 'horseCount': integer(2, 1, 4),
                        'docsReady': boolean, 'opsReady': boolean, 'blockerCount': integer(0)})
define('ReadinessCheck', {'code': st('APPROVED_PLAN'), 'group': enum('SHARED', 'ROAD', 'AIR'),
                          'tab': enum('overview', 'route', 'resources', 'readiness', 'incidents'),
                          'label': st('Phương án hiện hành đã được Manager duyệt'), 'ok': boolean, 'detail': optional_note})
define('Readiness', {'tripId': ident('TRIP'), 'binding': ref('Binding'), 'readinessVersion': integer(10, 1), 'approvedPlanVersion': nullable(v),
                     'docsReady': boolean, 'opsReady': boolean, 'canApproveDeparture': boolean, 'openChange': {'type': 'boolean', 'example': False},
                     'checkedAt': st('2026-11-09 15:00', pattern=stamp['pattern']), 'checks': arr(ref('ReadinessCheck'), 1, 100), 'blockers': arr(ref('Blocker'))})
define('DepartureInput', {'expectedVersion': integer(10, 1), 'approvedPlanVersion': v, 'readinessVersion': integer(10, 1)})
define('DepartureResult', {'tripId': ident('TRIP'), 'requestId': ident('REQUEST'), 'tripStatus': enum('READY_TO_DEPART'), 'requestStatus': enum('SCHEDULED'),
                           'binding': ref('Binding'), 'approvedPlanVersion': v, 'approvedBy': ref('Actor'), 'approvedAt': st('2026-11-09 15:00', pattern=stamp['pattern'])})
define('History', {'eventId': opaque('EVENT_001'), 'at': stamp, 'by': ref('Actor'), 'action': short,
                   'planVersion': nullable(v), 'detail': note})
define('BudgetCommand', {'expectedVersion': integer(10, 1), 'flightVersion': v})
define('BudgetDecisionInput', {'expectedVersion': integer(10, 1), 'flightVersion': v, 'decision': enum('APPROVE', 'RETURN'), 'reason': note}, ('reason',))
S['PickupDecisionInput']['required'].remove('reason')
for decision_schema in ('PlanDecisionInput', 'BudgetDecisionInput', 'PickupDecisionInput'):
    S[decision_schema].update({'if': {'properties': {'decision': {'const': 'RETURN'}}, 'required': ['decision']},
                               'then': {'required': ['reason']}})
define('DriverReport', {'incidentId': opaque('INCIDENT_001'), 'type': enum('ROAD_CLOSURE', 'TRAFFIC_ACCIDENT', 'BORDER_DELAY', 'OTHER', 'BAD_WEATHER'),
                        'stopId': nullable(opaque('STOP_001')), 'location': short, 'geo': nullable(ref('Geo')), 'at': stamp, 'description': note,
                        'blocking': boolean, 'locationSource': enum('MILESTONE_REPORT'), 'isGps': {'type': 'boolean', 'const': False}})


def sample(schema):
    if '$ref' in schema:
        return sample(S[schema['$ref'].rsplit('/', 1)[-1]])
    if 'example' in schema:
        return copy.deepcopy(schema['example'])
    if 'const' in schema:
        return schema['const']
    if 'anyOf' in schema:
        return None  # nullable examples show absence until a real result exists
    if 'enum' in schema:
        return schema['enum'][0]
    typ = schema.get('type')
    if typ == 'object':
        return {k: sample(val) for k, val in schema.get('properties', {}).items() if k in schema.get('required', [])}
    if typ == 'array':
        return [sample(schema['items']) for _ in range(schema.get('minItems', 0))]
    if typ == 'null':
        return None
    if typ == 'boolean':
        return True
    if typ in ('integer', 'number'):
        return schema.get('minimum', 1)
    return 'Thông tin'


# Shared, internally consistent ROAD target fixture; requests below are independent examples.
crew = {'MAIN_DRIVER': 'USER_008', 'CO_DRIVER': 'USER_009', 'VETERINARIAN': 'USER_010'}
resource = {'leg': 'road', 'vehicleId': 'VEHICLE_001', 'crew': crew, 'truckProfile': sample(ref('TruckProfile'))}
stops = []
for key, kind, lat, lng, at in [('stop-origin', 'ORIGIN', 10.7769, 106.7009, '2026-11-10 06:00'),
                                  ('stop-destination', 'DESTINATION', 10.90, 106.80, '2026-11-10 06:30')]:
    item = sample(ref('Stop'))
    item.update(stopId='STOP_001' if not stops else 'STOP_002', clientKey=key, type=kind, placeId=None,
                purposes=[], unload=False, required=True, geo={'lat': lat, 'lng': lng}, arriveAt=at, departAt=at, placeVersion=None)
    stops.append(item)
route = sample(ref('Routing'))
route.update(stops=copy.deepcopy(stops), issues=[], segments=[{'fromStopKey': 'stop-origin', 'toStopKey': 'stop-destination',
            'leg': 'road', 'km': 20, 'driveMin': 30, 'geometry': [[10.7769, 106.7009], [10.90, 106.80]]}])
plan = sample(ref('Plan'))
plan.update(status='DRAFT', stops=copy.deepcopy(stops), resources=[resource], routing=route, eta=route['eta'])
context = sample(ref('Context'))
context.update(horseIds=['HORSE_001', 'HORSE_002'], draft=plan, blockers=[])
context['binding']['planVersion'] = 1
context['pickup'].update(name='Trại nhận ngựa', geo=stops[0]['geo'])
context['delivery'].update(name='Trại giao ngựa', geo=stops[1]['geo'])
ready = sample(ref('ReadyStamp'))
ready.update(planVersion=1, invalidatedReason=None)


def op(code, method, path, roles, title, response, body=None, rules='', queries=None, result=None, errors=None, created=False, binary=False, multipart=False):
    if isinstance(roles, str):
        roles = [roles]
    params = []
    for key in re.findall(r'{(\w+)}', path):
        schema = ident('TRIP') if key == 'tripId' else ident('USER', 8) if key == 'staffId' else opaque('FILE_001' if key == 'fileId' else 'PARTNER_001' if key == 'partnerId' else 'PLACE_001')
        params.append({'name': key, 'in': 'path', 'required': True, 'schema': schema})
    for key, schema, required in queries or []:
        params.append({'name': key, 'in': 'query', 'required': required, 'schema': schema})
    if method != 'get' and code != 'F3-J07':
        params.append({'name': 'Idempotency-Key', 'in': 'header', 'required': True,
                       'schema': st('b141a4d2-3221-4a68-9b0e-1bac88cc1f0a', pattern=r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$')})
    responses = {}
    success_status = '201' if created else '200'
    if binary:
        responses['200'] = {'description': 'Binary file authorized by trip assignment; MIME/filename from stored metadata.',
                            'headers': {'Content-Disposition': {'schema': st('attachment; filename="booking.pdf"')}},
                            'content': {mime: {'schema': {'type': 'string', 'format': 'binary'}} for mime in ['application/pdf', 'image/jpeg', 'image/png']}}
    else:
        envelope = obj({'success': {'type': 'boolean', 'const': True}, 'message': st('OK'), 'data': response})
        responses[success_status] = {'description': 'Target response after persistence succeeds; not a live implementation.',
                                    'content': {'application/json': {'schema': envelope,
                                                'example': {'success': True, 'message': 'OK', 'data': copy.deepcopy(result) if result is not None else sample(response)}}}}
    for status, err in {'400': 'VALIDATION_ERROR', '401': 'UNAUTHENTICATED', '403': 'FORBIDDEN', '404': 'NOT_FOUND',
                        '409': (errors or ['STALE_VERSION'])[0], '429': 'RATE_LIMITED', '500': 'INTERNAL_ERROR', '501': 'FEATURE_NOT_SUPPORTED',
                        **({'503': 'ROUTING_UNAVAILABLE'} if code in ('F3-J25', 'F3-J26') else {}),
                        **({'413': 'FILE_TOO_LARGE', '415': 'UNSUPPORTED_MEDIA_TYPE'} if multipart else {})}.items():
        codes = errors if status == '409' and errors else [err]
        responses[status] = {'description': 'Request rejected; no partial state transition.', 'content': {'application/json': {
            'schema': ref('Error'), 'examples': {e: {'value': {'success': False, 'message': 'Yêu cầu chưa đủ điều kiện: ' + e,
            'errorCode': e, 'data': None, 'blockers': [{'code': e, 'field': 'planning', 'message': 'Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại'}]}} for e in codes}}}}
    operation = {'operationId': code, 'summary': title, 'description': rules or title, 'tags': [roles[0]], 'x-roles': roles,
                 'x-implementation-status': 'DESIGNED_NOT_IMPLEMENTED', 'parameters': params, 'responses': responses}
    if body:
        operation['requestBody'] = {'required': True, 'content': {'multipart/form-data' if multipart else 'application/json': {
            'schema': body, **({} if multipart else {'example': sample(body)})}}}
    OPS.append((code, method, path, operation))
    return operation


C = 'FLEET_ROUTE_COORDINATOR'
M = 'LOGISTICS_MANAGER'
T = 'TRANSPORT_SPECIALIST'
trip_path = '/coordinator/trips/{tripId}'
shared_conflicts = ['STALE_VERSION', 'DEPLOYMENT_REQUIRED', 'PLAN_LOCKED', 'DEPARTURE_APPROVAL_LOCKED']
submit_conflicts = shared_conflicts + ['RESOURCE_CONFLICT', 'INVALID_CREW', 'RESOURCES_NOT_CONFIRMED', 'TRUCK_ROUTE_REQUIRED',
    'PICKUP_CONSENT_REQUIRED', 'VEHICLE_ACCESS_RESTRICTED', 'CARE_POLICY_VIOLATION', 'DELIVERY_DEADLINE_EXCEEDED', 'FLIGHT_CATALOG_CHANGED']
op('F3-J01', 'get', '/master/flow3-capabilities', [C, M, T], 'Khả năng triển khai và policy Flow 3 v2', ref('Capabilities'),
   rules='Metadata contract mục tiêu; flags thực tế chỉ true sau nghiệm thu. Không lộ API key. Chưa có persistence/provider thì false và mutation trả 501.')
op('F3-J02', 'get', '/specialist/trips/{tripId}/planning-context', T, 'Context cho nhánh hồ sơ song song', ref('Context'), result=context,
   rules='Chỉ Trip được giao. Không tạo feasibility gate; không đợi Coordinator chốt lịch để chuẩn bị giấy.')
op('F3-J04', 'get', trip_path + '/planning-context', C, 'Context điều phối và cả hai nhánh chuẩn bị', ref('Context'), result=context)
op('F3-J05', 'get', '/coordinator/flights', C, 'Tra chuyến bay đối tác (read-only)', arr(ref('FlightService')), queries=[
    ('tripId', ident('TRIP'), False), ('partnerId', opaque('PARTNER_001'), False), ('code', st('EQA-DEMO-01', minLength=1, maxLength=100), False)],
   result=[{**sample(ref('FlightService')), 'blockers': []}], rules='Có tripId thì kiểm assignment, lịch/country/số ngựa. Không có lịch phù hợp trả []; không tự tạo schedule. Giá VND báo giá đã xác nhận.')
op('F3-J06', 'put', trip_path + '/plan-draft', C, 'Lưu nháp tuyến, lịch, xe và nhân sự', ref('Context'), ref('PlanDraftInput'),
   result=context, errors=shared_conflicts, rules='PLANNING + deployed. Tạo nếu chưa có draft, sửa DRAFT/RETURNED; không sửa APPROVED tại chỗ. Server cấp planVersion nội dung mới, tính dependency và invalidation. Draft cho thiếu, không giữ mới; thay bộ đã confirm giải phóng hold draft không còn dùng. Không nhận deadline/ETA/geometry/status/actor. Chọn bay qua J39.')
op('F3-J07', 'post', trip_path + '/plan/validate', C, 'Kiểm nháp, không giữ nguồn lực', ref('Validation'), ref('PlanCommand'),
   result={**sample(ref('Validation')), 'blockers': [], 'eta': route['eta']}, errors=shared_conflicts,
   rules='Read-only: thiếu điều kiện trả 200 valid=false + blockers; stale binding 409. Không tạo hold hoặc dấu READY; không bắt feasibility/docs-ready/booking AIR.')
op('F3-J08', 'post', trip_path + '/plan/submit', C, 'Gửi tổng thể và giữ tạm nguyên tử', ref('Context'), ref('PlanCommand'),
   result={**context, 'draft': {**plan, 'status': 'PENDING_APPROVAL'}, 'binding': {'version': 11, 'contextVersion': 1, 'planVersion': 1}},
   errors=submit_conflicts, rules='ROAD phải resourcesConfirmed hợp lệ. AIR chỉ đủ bộ dự kiến, chưa cần booking/confirm thực tế; tự submit budget nếu DRAFT/REJECTED. Cả hai kiểm server routing, truck, access, care, deadline, source, resource conflict và giữ tạm toàn bộ trong transaction. Không đợi Specialist feasibility/Docs READY.')
op('F3-J09', 'post', trip_path + '/plan/withdraw', C, 'Rút nháp/chờ duyệt/trả lại', ref('Context'), ref('PlanCommand'), result=context,
   errors=shared_conflicts, rules='WITHDRAWN, giải phóng hold đúng draft, giữ approved cũ và history; không hủy booking đối tác. Không rút approved bằng endpoint này.')
op('F3-J10', 'get', '/manager/trips/{tripId}/preparation', M, 'Manager xem hai nhánh và bundle cần duyệt', ref('Context'), result=context)
op('F3-J11', 'post', '/manager/trips/{tripId}/plan/decision', M, 'Duyệt/trả toàn bộ phương án', ref('Context'), ref('PlanDecisionInput'),
   result={**context, 'draft': None, 'approvedPlan': {**plan, 'status': 'APPROVED'}, 'binding': {'version': 12, 'contextVersion': 1, 'planVersion': 1}},
   errors=submit_conflicts + ['OLD_BOOKING_ACTIVE'], rules='Chỉ đúng pending snapshot. RETURN cần reason>=5, giải phóng hold draft. APPROVE recheck atomic; ROAD cần confirm còn đúng; AIR duyệt cả budget/nguồn lực dự kiến, chưa booking, xóa confirm thực tế cũ. Không yêu cầu Docs READY. Approved cũ chỉ SUPERSEDED khi approve mới thành công.')
op('F3-J12', 'post', trip_path + '/plan/changes', C, 'Tạo bản điều chỉnh approved/flight proposal', ref('Context'), ref('ReasonCommand'), result=context,
   errors=shared_conflicts, rules='Giữ approved/booking/history; tạo DRAFT nội dung revision mới, vô hiệu evidence bị ảnh hưởng và chặn departure. Flight pending có thể rút trước khi sửa; không overwrite BOOKED. Không tự gửi duyệt hoặc đổi hạn giao.')
op('F3-J13', 'post', trip_path + '/flight/booking', C, 'Ghi nhận booking đã xác nhận bởi đối tác', ref('Context'), ref('BookingInput'),
   result={**context, 'booking': sample(ref('Booking'))}, errors=shared_conflicts + ['PLAN_NOT_APPROVED', 'FLIGHT_CATALOG_CHANGED', 'BOOKING_REFERENCE_DUPLICATE'],
   rules='AIR approved plan + budget đúng flightVersion/catalog snapshot; confirmedHorses đúng mapping. Booking external, không gọi hãng thật; mã unique case-fold theo partner giữa các Trip. File tùy chọn phải thuộc Trip, đã scan. DEMO chỉ trip demo/capability. Thành công xóa confirm vận hành để J14 kiểm lại.')
op('F3-J14', 'post', trip_path + '/resources/confirm', C, 'Xác nhận bố trí xe/người và tính Ops READY', ref('Context'), ref('PlanCommand'),
   result={**context, 'resourcesConfirmed': ready}, errors=shared_conflicts + ['RESOURCE_CONFLICT', 'INVALID_CREW', 'PLAN_NOT_APPROVED'],
   rules='ROAD DRAFT đủ bộ trước submit, tạo hold nguyên tử; không cần plan approved. AIR sau approved+BOOKED đúng plan, kiểm thực tế. Không dùng chung gate booking AIR cho ROAD; opsReady chỉ valid khi toàn bộ điều kiện vận hành đã đủ.')
op('F3-J15', 'post', trip_path + '/ops-ready', C, 'Kiểm tra/xác nhận lại Ops READY', ref('Context'), ref('PlanCommand'), result=context,
   errors=shared_conflicts + ['PLAN_NOT_APPROVED', 'RESOURCES_NOT_CONFIRMED'], rules='Compatibility command sau APPROVED, cùng kiểm tra vận hành như J14; không boolean client. J14 đã tính Ops READY nên frontend không bắt thêm nút mới.')
op('F3-J16', 'post', '/specialist/trips/{tripId}/docs-ready', T, 'Xác nhận Docs READY độc lập nhánh điều phối', ref('Context'), ref('Expected'),
   result={**context, 'docsReady': {**ready, 'planVersion': None}}, errors=['STALE_VERSION', 'DOCS_NOT_READY', 'DEPARTURE_APPROVAL_LOCKED'],
   rules='PLANNING, đúng assigned Specialist, đã áp bộ yêu cầu/đủ hồ sơ approved + insurance VERIFIED; không bắt plan approved/feasibility/timed schedule. Stamp lưu doc/insurance/context dependency; plan/lịch đổi đánh giá lại, không sao chép valid mù.')
op('F3-J17', 'get', '/manager/trips/{tripId}/readiness', M, 'Đọc gate và revision duyệt khởi hành', ref('Readiness'),
   result={**sample(ref('Readiness')), 'approvedPlanVersion': 1, 'blockers': []}, rules='Projection do server tính, không tạo READY. checkedAt không cấp lease; POST phải recheck toàn bộ.')
op('F3-J18', 'post', '/manager/trips/{tripId}/departure/approve', M, 'Duyệt khởi hành riêng', ref('DepartureResult'), ref('DepartureInput'),
   result={**sample(ref('DepartureResult')), 'binding': {'version': 11, 'contextVersion': 1, 'planVersion': 1}},
   errors=['READINESS_CHANGED', 'STALE_VERSION', 'DEPARTURE_APPROVAL_LOCKED'],
   rules='Atomic recheck context/contract/deposit/plan+no open change, resources, truck/access/care, Docs/Ops READY, insurance/quarantine, AIR budget+booking, deadline/serverNow<=plannedDepart/no blocking incident. Change returns 409 blockers. Commit Trip READY_TO_DEPART + Request SCHEDULED + audit/notification, không DEPARTED.')
op('F3-J19', 'get', '/trips/{tripId}/planning-history', [C, M, T], 'Lịch sử phương án, quyết định và bằng chứng', arr(ref('History')),
   result=[sample(ref('History'))], rules='Cùng quyền assigned trip/manager scope; immutable history cả rút/trả, consent/booking hủy và invalidation. Không hard-delete để làm sạch revision.')
op('F3-J20', 'post', trip_path + '/flight/booking/cancel', C, 'Ghi nhận hủy booking đã được đối tác xác nhận', ref('Context'), ref('CancelBookingInput'),
   result=context, errors=shared_conflicts + ['OLD_BOOKING_ACTIVE'], rules='Chỉ pre-departure; không gọi hãng/hủy ngoài thực tế. Lưu xác nhận hủy + lịch sử, vô hiệu Ops READY; không tự hoàn tiền hoặc rewrite booking. Retry không ghi đôi.')
op('F3-J23', 'get', '/coordinator/trips', C, 'Danh sách chuyến được giao và KPI planning', arr(ref('TripListItem')),
   queries=[('status', enum('PLANNING', 'READY_TO_DEPART', 'IN_TRANSIT', 'COMPLETED'), False), ('mode', mode, False)], result=[sample(ref('TripListItem'))])
op('F3-J24', 'get', trip_path, C, 'Chi tiết chuyến, điểm nhận/giao, ngựa và readiness', ref('Context'), result=context)
op('F3-J25', 'post', trip_path + '/plan/routing', C, 'Tính tuyến đường bộ tham khảo', ref('Routing'), ref('RoutingInput'),
   result={**route, 'provider': 'OSRM', 'truckVerified': False}, errors=shared_conflicts + ['ROUTING_REQUIRED', 'CARE_POLICY_VIOLATION'],
   rules='Resolve current saved stops từ server; provider URL/key server, không SSRF URL client. Tính geometry/times theo policy; OSRM không truck verification. Lưu routing evidence tăng aggregate version; client refetch context. Dữ liệu demo chỉ Trip demo được bật.')
op('F3-J26', 'post', trip_path + '/plan/truck-check', C, 'Kiểm tuyến theo kích thước/tải trọng xe', ref('Routing'), ref('RoutingInput'), result=route,
   errors=shared_conflicts + ['TRUCK_ROUTE_REQUIRED', 'VEHICLE_ACCESS_RESTRICTED', 'CARE_POLICY_VIOLATION'],
   rules='HERE_TRUCK server-side từng ROAD với profile đúng xe; validate gross/current/axle/spec. Critical restriction hoặc snap>250m chặn. Lưu provider result/dependency, không tin client signature/ok; provider unavailable 503 không fallback OSRM thành verified. Refetch version sau thành công.')
op('F3-J27', 'get', trip_path + '/vehicle-options', C, 'Lọc xe theo chặng/sức chứa/quốc gia/lối vào', arr(ref('VehicleOption')),
   queries=[('leg', leg_key, True)], result=[sample(ref('VehicleOption'))], rules='ROAD leg=road, AIR outbound/inbound. Check vehicle.spec so access pickup/delivery, status/conflict/capacity; unknown spec có blocker không tự suy stalls. GET không giữ xe.')
op('F3-J28', 'put', trip_path + '/pickup-access', C, 'Ghi xác minh xe có vào địa chỉ nhận', ref('Context'), ref('AccessInput'), result=context,
   errors=shared_conflicts + ['PICKUP_CONSENT_REQUIRED'], rules='DRAFT (hoặc chưa có route), xe/profile đã lưu; proof>=8, acknowledged. Bind server xe/profile/request endpoint. Consent đã chốt không sửa đè: J33 trước. Vô hiệu routing/confirm liên quan.')
op('F3-J29', 'get', trip_path + '/pickup-relocation/candidates', C, 'Tìm cơ sở tiếp nhận thay thế', arr(ref('PickupCandidate')),
   result=[sample(ref('PickupCandidate'))], rules='Cùng country active QUARANTINE, parking/loading/waterFeed/capacity và mở toàn khoảng handover; km đường thẳng gắn nhãn. Không đặt cơ sở realtime.')
op('F3-J30', 'post', trip_path + '/pickup-relocation', C, 'Đề xuất điểm nhận thay thế', ref('Context'), ref('PickupProposalInput'), result=context,
   errors=shared_conflicts + ['PLACE_CHANGED', 'PICKUP_CONSENT_REQUIRED'],
   rules='Chỉ sau INACCESSIBLE đúng xe; DRAFT, placeVersion live, reason>=10 + facilityConfirmed. PROPOSED không đổi ORIGIN. Lưu place/access snapshot và notify Manager. Consent đang chốt cần J33 trước.')
op('F3-J31', 'post', '/manager/trips/{tripId}/pickup-relocation/decision', M, 'Manager xét đề xuất điểm nhận', ref('Context'), ref('PickupDecisionInput'),
   result=context, errors=shared_conflicts + ['PLACE_CHANGED'], rules='APPROVE PROPOSED→MANAGER_APPROVED sau recheck; RETURN PROPOSED/MANAGER_APPROVED→REJECTED reason>=5. Không tự coi khách đồng ý hoặc đổi ORIGIN.')
op('F3-J32', 'post', '/manager/trips/{tripId}/pickup-relocation/customer-consent', M, 'Ghi nhận khách đã đồng ý thực tế', ref('Context'), ref('ConsentInput'),
   result=context, errors=shared_conflicts + ['PLACE_CHANGED', 'PICKUP_CONSENT_REQUIRED'],
   rules='Chỉ MANAGER_APPROVED đúng relocation/version/vehicle/profile/place/handoverAt. Channel PHONE/EMAIL/WRITTEN, note>=10, acknowledged; chuyển CUSTOMER_CONFIRMED, ORIGIN draft mới dùng place; giữ pickup gốc, invalidate routing/confirm, notify Coordinator. Không chỉ gửi thông báo là consent.')
op('F3-J33', 'post', trip_path + '/pickup-relocation/revisions', C, 'Mở lại đề xuất điểm nhận đã chốt', ref('Context'), ref('Expected'), result=context,
   errors=shared_conflicts, rules='Chỉ draft chỉnh sửa; archive consent, clear access/relocation/routing/confirm hiện hành; giữ lịch sử, quay điểm gốc cho tới consent mới. Không overwrite thỏa thuận cũ.')
op('F3-J34', 'get', '/coordinator/air-partners', C, 'Danh sách bên dịch vụ bay', arr(ref('Partner')), result=[sample(ref('Partner'))])
op('F3-J35', 'post', '/coordinator/air-partners', C, 'Thêm bên dịch vụ', ref('Partner'), ref('PartnerInput'), created=True)
op('F3-J36', 'put', '/coordinator/air-partners/{partnerId}', C, 'Sửa thông tin bên dịch vụ', ref('Partner'), ref('PartnerUpdate'), errors=['STALE_VERSION'],
   rules='Chỉ thông tin partner, không sửa schedule; tăng record version, không rewrite snapshot plan/hợp đồng.')
op('F3-J37', 'put', '/coordinator/air-partners/{partnerId}/status', C, 'Kích hoạt/ngừng bên dịch vụ', ref('Partner'), ref('PartnerStatus'),
   errors=['STALE_VERSION'], rules='Notify/invalidate live operational evidence bị ảnh hưởng, giữ snapshot/history. Không tự hủy booking đối tác.')
op('F3-J38', 'delete', '/coordinator/air-partners/{partnerId}', C, 'Xóa đối tác chưa từng tham chiếu', ref('Deleted'),
   queries=[('expectedVersion', v, True)], errors=['STALE_VERSION', 'RECORD_REFERENCED'],
   rules='DELETE không body, version ở query + idempotency header. Nếu catalogue schedule/plan/contract/booking/history tham chiếu trả 409, chỉ đổi status.')
op('F3-J39', 'put', trip_path + '/flight/selection', C, 'Chọn dịch vụ đúng partner/mã vào draft', ref('Context'), ref('FlightSelectInput'), result=context,
   errors=shared_conflicts + ['FLIGHT_PROVIDER_MISMATCH', 'FLIGHT_CATALOG_CHANGED'],
   rules='AIR DRAFT, serviceId + partnerId + providerFlightCode + catalogVersion phải cùng bản. Server resolve snapshot/giá VND/lịch/khả dụng/sân bay/capacity/care; không nhận giá tên tự nhập. Thay nội dung tăng planVersion, clear dependent route/budget/confirm; không tạo booking.')
op('F3-J40', 'post', trip_path + '/flight/proposal/submit', C, 'Gửi riêng chi phí dịch vụ bay', ref('Context'), ref('BudgetCommand'), result=context,
   errors=shared_conflicts + ['FLIGHT_CATALOG_CHANGED'], rules='AIR DRAFT proposal→BUDGET_PENDING, lưu snapshot bất biến; chưa thay tổng thể J08. Không hold slot hãng hoặc mở booking.')
op('F3-J41', 'post', '/manager/trips/{tripId}/flight/decision', M, 'Manager xét ngân sách bay riêng', ref('Context'), ref('BudgetDecisionInput'), result=context,
   errors=shared_conflicts + ['FLIGHT_CATALOG_CHANGED'], rules='BUDGET_PENDING đúng flightVersion; APPROVE→BUDGET_APPROVED, RETURN→REJECTED reason>=5. Không thay J11 và không mở J13 khi plan chưa approved. J11 vẫn có thể quyết định tổng thể ngân sách cùng bundle.')
upload = obj({'expectedVersion': integer(10, 1), 'file': {'type': 'string', 'format': 'binary'}})
op('F3-J42', 'post', trip_path + '/flight/evidence', C, 'Upload bằng chứng đối tác (tùy chọn booking)', ref('File'), upload, multipart=True, created=True,
   rules='Multipart expectedVersion + file bytes thật; PDF/JPEG/PNG <=10485760. Check assignment/state, magic bytes/MIME/scan, private storage; không public URL/base64. Trả fileId; refetch context revision trước J13/J20. Upload đơn thuần không là BOOKED.')
op('F3-J43', 'get', '/coordinator/places', C, 'Danh mục đa chức năng cho bản đồ', arr(ref('Place')),
   queries=[('country', country, False), ('function', enum('REST', 'FUEL', 'QUARANTINE', 'BORDER', 'AIRPORT'), False),
            ('status', enum('ACTIVE', 'SUSPENDED', 'INACTIVE'), False)], result=[sample(ref('Place'))])
op('F3-J44', 'post', '/coordinator/places', C, 'Thêm địa điểm dùng chung', ref('Place'), ref('PlaceInput'), created=True,
   errors=['DUPLICATE_PLACE'], rules='Check coordinates, functions and conditional extras: REST capacity>0, AIRPORT IATA/horseHandling; duplicate<50m chặn. Không tạo pickup/delivery cá nhân vào public catalogue. Server status ACTIVE/sample=false.')
op('F3-J45', 'put', '/coordinator/places/{placeId}', C, 'Sửa địa điểm và giờ mở', ref('Place'), ref('PlaceUpdate'), errors=['STALE_VERSION', 'DUPLICATE_PLACE'],
   rules='Validate hours qua đêm và extras đúng functions, version tăng; không rewrite approved snapshot. Live consent/evidence stale phải re-evaluate và báo Trip liên quan.')
op('F3-J46', 'put', '/coordinator/places/{placeId}/status', C, 'Đổi trạng thái cơ sở', ref('Place'), ref('PlaceStatus'), errors=['STALE_VERSION'],
   rules='Tạm ngừng/đóng invalidate evidence bị ảnh hưởng; không xóa history hoặc tự đổi điểm trên plan đã duyệt.')
op('F3-J47', 'delete', '/coordinator/places/{placeId}', C, 'Xóa địa điểm chưa được tham chiếu', ref('Deleted'),
   queries=[('expectedVersion', v, True)], errors=['STALE_VERSION', 'RECORD_REFERENCED'], rules='Không body. Check mọi plan/consent/checkpoint/catalog/history reference trong transaction; có tham chiếu chỉ đổi trạng thái.')
op('F3-J48', 'get', '/coordinator/staff', [C, M], 'Danh mục nhân sự và trạng thái vận hành', arr(ref('Staff')),
   queries=[('tripId', ident('TRIP'), False), ('leg', leg_key, False), ('status', enum('ACTIVE', 'ON_LEAVE', 'INACTIVE'), False)],
   result=[sample(ref('Staff'))], rules='tripId/leg phải đi cặp khi tính eligible theo chặng; check assigned scope. Không expose payroll/password/PII ngoài quyền. Không tạo/xóa nhân viên trong Flow 3.')
op('F3-J49', 'put', '/coordinator/staff/{staffId}/status', [C, M], 'Đổi ACTIVE/ON_LEAVE/INACTIVE', ref('Staff'), ref('StaffStatus'),
   errors=['STALE_VERSION', 'STAFF_IN_TRANSIT'], rules='IN_TRANSIT không cho nghỉ/ngừng nếu chưa thay qua incident workflow. PLANNING liên quan clear confirmation/opsReady và notify Manager. READY_TO_DEPART liên quan phải chặn actual departure, không để dấu cũ hợp thức.')
op('F3-J50', 'get', '/manager/flights', M, 'Manager đọc catalogue bay', arr(ref('FlightService')), result=[sample(ref('FlightService'))],
   queries=[('tripId', ident('TRIP'), False), ('partnerId', opaque('PARTNER_001'), False)], rules='Read-only; tripId phải manager scope. Không chỉnh lịch/giá đối tác.')
op('F3-J51', 'get', '/manager/air-partners', M, 'Manager đọc bên dịch vụ', arr(ref('Partner')), result=[sample(ref('Partner'))])
op('F3-J52', 'get', '/trips/{tripId}/planning-files/{fileId}', [C, M, T], 'Tải bằng chứng planning có xác thực', None, binary=True,
   rules='File phải thuộc Trip và actor assigned/scope; trả MIME+Content-Disposition an toàn, lỗi JSON. Không dùng fileId để đọc path tùy ý; file booking chỉ role có quyền nghiệp vụ được cấp.')
op('F3-J53', 'get', trip_path + '/route-reports', C, 'Đọc báo cáo tài xế gắn mốc trên bản đồ', arr(ref('DriverReport')),
   result=[sample(ref('DriverReport'))], rules='Projection Flow 5 có stopId/geo nullable; thiếu vị trí không bịa GPS. Không ghi traffic/sửa đường tự động từ HERE. Không có báo cáo trả []; chưa có sự cố không chứng minh đường không tắc.')
op('F3-J54', 'get', '/coordinator/flights/lookup', C, 'Tra mã chuyến trong đúng bên dịch vụ', ref('FlightService'),
   queries=[('tripId', ident('TRIP'), True), ('partnerId', opaque('PARTNER_001'), True), ('providerFlightCode', st('EQA-DEMO-01', minLength=1, maxLength=100), True)],
   result=sample(ref('FlightService')), errors=['FLIGHT_PROVIDER_MISMATCH', 'FLIGHT_CODE_AMBIGUOUS'],
   rules='Lookup trim/case-fold; không map mã bên khác. Không thấy toàn catalogue trả 404; mã thuộc partner khác 409 mismatch chỉ trong catalogue actor có quyền. Nhiều lịch cùng partner/code 409 ambiguous (dùng J05 lấy candidates để chọn serviceId). Lookup không chọn/giữ/booking.')
op('F3-J55', 'get', '/coordinator/vehicles', C, 'Danh mục xe và thông số đã xác minh', arr(ref('VehicleOption')),
   result=[sample(ref('VehicleOption'))], rules='Giữ URL F2-J36, mở rộng projection spec/assignment. eligible ở đây chỉ khả dụng chung; chọn theo Trip phải dùng J27. Không CRUD xe bằng Flow 3.')

# Replace generated generic examples with domain-consistent requests.
by_id = {c: o for c, _, _, o in OPS}
draft_body = by_id['F3-J06']['requestBody']['content']['application/json']['example']
draft_body.update(plannedDepart='2026-11-10 06:00', resources=[resource],
                  stops=[{k: s[k] for k in S['StopInput']['properties']} for s in stops])
for code in ('F3-J34', 'F3-J35', 'F3-J36', 'F3-J37', 'F3-J43', 'F3-J44', 'F3-J45', 'F3-J46', 'F3-J48', 'F3-J49', 'F3-J55'):
    content = next(iter(by_id[code]['responses'].values()))['content']['application/json']['example']['data']
    values = content if isinstance(content, list) else [content]
    for val in values:
        if isinstance(val, dict) and 'blockers' in val:
            val['blockers'] = []
        if 'functions' in val and 'REST' in val['functions']:
            val['rest'] = sample(ref('RestFacilities'))
        if 'spec' in val:
            val['spec'] = sample(ref('VehicleSpec'))
        if 'licence' in val:
            val['licence'] = 'FC'
for code in ('F3-J44', 'F3-J45'):
    by_id[code]['requestBody']['content']['application/json']['example']['rest'] = sample(ref('RestFacilities'))
response = by_id['F3-J23']['responses']['200']['content']['application/json']['example']['data'][0]
response.update(planningState='AWAITING_ROUTE', docsReady=False, opsReady=False)
by_id['F3-J27']['responses']['200']['content']['application/json']['example']['data'][0]['spec'] = sample(ref('VehicleSpec'))
pickup_candidate = by_id['F3-J29']['responses']['200']['content']['application/json']['example']['data'][0]
pickup_candidate['place'].update(functions=['QUARANTINE', 'REST'], rest=sample(ref('RestFacilities')), service=sample(ref('PlaceService')))
def response_data(code):
    operation = by_id[code]
    response = next(value for status, value in operation['responses'].items() if status.startswith('2'))
    return response['content']['application/json']['example']['data']


# Every mutation returns a newer aggregate/record revision, not the input revision.
for code, method, _, operation in OPS:
    if method == 'get' or code == 'F3-J07':
        continue
    data = response_data(code)
    if 'binding' in data:
        data['binding']['version'] = 11
        data['binding']['planVersion'] = 1
    if 'version' in data:
        data['version'] = 1 if code in ('F3-J35', 'F3-J44') else 2
    if 'sample' in data:
        data['sample'] = False

response_data('F3-J09').update(draft=None)
response_data('F3-J09')['binding']['planVersion'] = None
response_data('F3-J12').update(approvedPlan={**copy.deepcopy(plan), 'status': 'APPROVED'},
                              draft={**copy.deepcopy(plan), 'planVersion': 2, 'routing': None})
response_data('F3-J12')['binding']['planVersion'] = 2
for code in ('F3-J06', 'F3-J32', 'F3-J33', 'F3-J39'):
    data = response_data(code)
    data['binding']['planVersion'] = 2
    if data['draft']:
        data['draft'].update(planVersion=2, routing=None, eta=None)
    data.update(resourcesConfirmed=None, opsReady=None)
for code in ('F3-J28', 'F3-J30', 'F3-J31'):
    data = response_data(code)
    data['draft'].update(routing=None, eta=None)
    data.update(resourcesConfirmed=None, opsReady=None)
response_data('F3-J28')['pickupAccess'] = sample(ref('PickupAccess'))
for code, state in [('F3-J30', 'PROPOSED'), ('F3-J31', 'MANAGER_APPROVED'), ('F3-J32', 'CUSTOMER_CONFIRMED')]:
    data = response_data(code)
    data['pickupAccess'] = {**sample(ref('PickupAccess')), 'result': 'INACCESSIBLE'}
    data['pickupRelocation'] = {**sample(ref('PickupRelocation')), 'status': state,
                                'customerConsent': sample(ref('Consent')) if code == 'F3-J32' else None}
    data['pickupRelocation']['placeSnapshot']['functions'] = ['QUARANTINE', 'REST']
    data['pickupRelocation']['placeSnapshot']['rest'] = sample(ref('RestFacilities'))
    data['pickupRelocation']['placeSnapshot']['service'] = sample(ref('PlaceService'))
    if code == 'F3-J32':
        data['draft']['stops'][0].update(placeId='PLACE_001', placeVersion=1,
                                        name='Điểm tiếp nhận đã thống nhất', geo=data['pickupRelocation']['placeSnapshot']['geo'])
response_data('F3-J15').update(draft=None, approvedPlan={**copy.deepcopy(plan), 'status': 'APPROVED'},
                              resourcesConfirmed=ready, opsReady=ready)
response_data('F3-J17')['checks'] = [
    {'code': code, 'group': 'SHARED', 'tab': tab, 'label': label, 'ok': True, 'detail': 'Đã kiểm tra theo bằng chứng hiện hành'}
    for code, tab, label in [
        ('DEPLOYMENT_CONFIRMED', 'overview', 'Đã giao việc và đúng phân công'),
        ('CONTRACT_EFFECTIVE', 'overview', 'Hợp đồng hiệu lực và cọc đã xác minh'),
        ('APPROVED_PLAN', 'route', 'Đúng phương án được Manager duyệt, không bản sửa mở'),
        ('RESOURCES_CONFIRMED', 'resources', 'Xe và ba người mỗi ROAD khả dụng, đã xác nhận'),
        ('TRUCK_ROUTE_VERIFIED', 'route', 'Tuyến theo đúng kích thước và tải trọng xe'),
        ('ENDPOINT_ACCESS_VERIFIED', 'route', 'Xe tiếp cận được điểm nhận/giao hoặc điểm nhận thay thế đã đồng ý'),
        ('CARE_POLICY_VALID', 'route', 'Lịch dừng nghỉ và bàn giao phù hợp'),
        ('DELIVERY_DEADLINE_VALID', 'route', 'ETA trong hạn giao và chưa quá giờ khởi hành'),
        ('DOCUMENTS_APPROVED', 'readiness', 'Đủ bộ hồ sơ được duyệt'),
        ('INSURANCE_VERIFIED', 'readiness', 'Bảo hiểm đã xác minh và bao phủ'),
        ('QUARANTINE_VALID', 'readiness', 'Lịch kiểm dịch bắt buộc đã xác nhận hoặc không yêu cầu'),
        ('DOCS_READY_VALID', 'readiness', 'Docs READY còn đúng nội dung hiện tại'),
        ('OPS_READY_VALID', 'resources', 'Ops READY còn đúng nội dung hiện tại'),
        ('NO_BLOCKING_INCIDENT', 'incidents', 'Không sự cố đang chặn khởi hành'),
    ]
]
response_data('F3-J38')['id'] = 'PARTNER_001'
response_data('F3-J13')['booking'] = sample(ref('Booking'))

# ROAD submit/approve samples carry the required pre-confirmation and pickup evidence.
for code in ('F3-J08', 'F3-J11', 'F3-J14', 'F3-J15'):
    data = response_data(code)
    data['resourcesConfirmed'] = copy.deepcopy(ready)
    data['pickupAccess'] = sample(ref('PickupAccess'))
    if code == 'F3-J11':
        data['opsReady'] = copy.deepcopy(ready)

flight_service = sample(ref('FlightService'))
flight_service['blockers'] = []
air_resources = [copy.deepcopy(resource), copy.deepcopy(resource)]
air_resources[0]['leg'] = 'outbound'
air_resources[1].update(leg='inbound', vehicleId='VEHICLE_002',
    crew={'MAIN_DRIVER': 'USER_011', 'CO_DRIVER': 'USER_012', 'VETERINARIAN': 'USER_013'})
air_resources[1]['truckProfile']['vehicleId'] = 'VEHICLE_002'
air_stops = []
for i, (key, kind, place_id, arrive, depart, geo) in enumerate([
    ('air-origin', 'ORIGIN', None, '2026-11-10 11:00', '2026-11-10 11:00', {'lat': 10.7769, 'lng': 106.7009}),
    ('air-departure', 'AIRPORT', 'AIRPORT_001', '2026-11-10 11:30', '2026-11-10 15:00', {'lat': 10.8188, 'lng': 106.6519}),
    ('air-arrival', 'AIRPORT', 'AIRPORT_002', '2026-11-10 20:30', '2026-11-10 22:30', {'lat': 35.772, 'lng': 140.3929}),
    ('air-destination', 'DESTINATION', None, '2026-11-10 23:00', '2026-11-10 23:00', {'lat': 35.80, 'lng': 140.40}),
]):
    item = copy.deepcopy(stops[0])
    item.update(stopId=f'STOP_{i+1:03}', clientKey=key, type=kind, placeId=place_id, placeVersion=1 if place_id else None,
        purposes=['AIRPORT'] if place_id else [], arriveAt=arrive, departAt=depart, geo=geo,
        dwellMin=210 if i == 1 else 120 if i == 2 else 0, name=key)
    air_stops.append(item)
air_route = {**copy.deepcopy(route), 'stops': air_stops, 'flyMin': 330, 'driveMin': 60, 'stopMin': 330,
             'eta': '2026-11-10 23:00', 'totalKm': 40, 'segments': []}
for i, j, leg in [(0, 1, 'outbound'), (2, 3, 'inbound')]:
    air_route['segments'].append({'fromStopKey': air_stops[i]['clientKey'], 'toStopKey': air_stops[j]['clientKey'],
        'leg': leg, 'km': 20, 'driveMin': 30, 'geometry': [[s['geo']['lat'], s['geo']['lng']] for s in [air_stops[i], air_stops[j]]]})
air_plan = {**copy.deepcopy(plan), 'mode': 'AIR', 'status': 'APPROVED', 'plannedDepart': '2026-11-10 11:00',
            'eta': air_route['eta'], 'stops': air_stops, 'resources': air_resources, 'routing': air_route,
            'flight': {'flightVersion': 1, 'status': 'BUDGET_APPROVED', 'service': flight_service, 'careAcknowledged': True}}
air_context = {**copy.deepcopy(context), 'mode': 'AIR', 'draft': None, 'approvedPlan': air_plan,
               'pickupAccess': sample(ref('PickupAccess')), 'binding': {'version': 11, 'contextVersion': 1, 'planVersion': 1}}
air_context['delivery'].update(country='JP', geo=air_stops[-1]['geo'])
for code in ('F3-J13', 'F3-J20', 'F3-J39', 'F3-J40', 'F3-J41'):
    dest = response_data(code)
    dest.clear()
    dest.update(copy.deepcopy(air_context))
    if code in ('F3-J13', 'F3-J20'):
        dest['booking'] = {**sample(ref('Booking')), 'status': 'CANCELLED' if code == 'F3-J20' else 'BOOKED'}
        dest['approvedPlan']['flight']['status'] = 'BOOKED' if code == 'F3-J13' else 'BUDGET_APPROVED'
    else:
        dest.update(approvedPlan=None, draft=copy.deepcopy(air_plan))
        dest['draft']['status'] = 'DRAFT'
        dest['draft']['flight']['status'] = {'F3-J39': 'DRAFT', 'F3-J40': 'BUDGET_PENDING', 'F3-J41': 'BUDGET_APPROVED'}[code]
        if code == 'F3-J39':
            dest['binding']['planVersion'] = 2
            dest['draft'].update(planVersion=2, routing=None, eta=None)

paths = {}
for code, method, path, operation in OPS:
    paths.setdefault(path, {})[method] = operation
spec = {'openapi': '3.1.0', 'info': {'title': 'Racehorse Transport — Flow 3 / Final_Flow3.html', 'version': '2.0.0',
        'description': 'Target contract only. Parallel preparation; ROAD pre-confirm, AIR approve then book/confirm. Backend/DB not implemented by these artifacts.'},
        'servers': [{'url': '/api'}], 'security': [{'bearerAuth': []}], 'paths': paths,
        'components': {'securitySchemes': {'bearerAuth': {'type': 'http', 'scheme': 'bearer', 'bearerFormat': 'JWT'}}, 'schemas': S},
        'x-retired-operations': [
            {'operationId': 'F3-J03', 'method': 'PUT', 'path': '/specialist/trips/{tripId}/planning-feasibility', 'replacement': 'parallel preparation; J02/J04', 'errorCode': 'CONTRACT_SUPERSEDED'},
            {'operationId': 'F3-J21', 'method': 'GET', 'path': trip_path + '/timed-documents', 'replacement': 'J04, no blocking timed-documents gate', 'errorCode': 'CONTRACT_SUPERSEDED'},
            {'operationId': 'F3-J22', 'method': 'POST', 'path': trip_path + '/timed-documents/schedule', 'replacement': 'J06, no sequential document unlock', 'errorCode': 'CONTRACT_SUPERSEDED'}]}


def dump(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'


(ROOT / 'flow3.openapi.json').write_text(dump(spec), encoding='utf-8')
md = ['# Flow 3 v2 — JSON từng API', '', 'Cập nhật 27/10/2026 theo `Final_Flow3.html`, ghi đè contract cũ. **Chỉ tài liệu mục tiêu, chưa triển khai backend/DB.**',
      '', '[Quy tắc nghiệp vụ](FLOW3.md) · [OpenAPI](flow3.openapi.json) · [Kịch bản](flow3.examples.json).', '',
      'Base `/api`, Bearer JWT. Mẫu mỗi API độc lập; lấy ID/revision từ response thật, không chạy nối tiếp các mẫu có cùng version. GET/DELETE không body; DELETE gửi expectedVersion qua query. Mutation có Idempotency-Key UUID, riêng POST validate read-only không cần. List trả data array; binary tải xác thực. Actor/time/status/deadline/giá server cấp. Thời gian Asia/Ho_Chi_Minh; tiền nguyên VND.', '',
      '| Mã | Method | Endpoint | Chức năng |', '|---|---|---|---|']
md += [f'| {c} | {m.upper()} | `{p}` | {o["summary"]} |' for c, m, p, o in OPS]
md += ['', 'F3-J03/J21/J22 đã retired; xem bảng chuyển đổi trong FLOW3.md. Không còn feasibility/timed-document gate. Mỗi endpoint sau đây bao gồm schema, JSON thành công và mã lỗi trong OpenAPI.', '']
for code, method, path, operation in OPS:
    md += [f'## {code} — {method.upper()} {path}', '', operation['summary'] + '.', '',
           '**Role:** ' + ', '.join(f'`{r}`' for r in operation['x-roles']) + '.', '', '**Điều kiện và ảnh hưởng:** ' + operation['description'], '']
    if operation['parameters']:
        md += ['| Vị trí | Tên | Bắt buộc | Schema |', '|---|---|---|---|']
        md += [f'| {p["in"]} | `{p["name"]}` | {"Có" if p["required"] else "Không"} | `{json.dumps(p["schema"], ensure_ascii=False)}` |' for p in operation['parameters']]
        md += ['']
    body = operation.get('requestBody', {}).get('content', {})
    if 'application/json' in body:
        md += ['**Request JSON**', '', '```json', dump(body['application/json']['example']).rstrip(), '```', '']
    elif body:
        md += ['**Request multipart/form-data:** `expectedVersion` và `file` bytes thật PDF/JPEG/PNG <=10 MiB; trình duyệt tự sinh boundary. Không gửi JSON/base64/object URL.', '']
    else:
        md += ['**Request body:** Không gửi.', '']
    for status, response in operation['responses'].items():
        content = response['content'].get('application/json')
        if not content:
            md += [f'**Response {status}:** binary MIME từ metadata; Content-Disposition an toàn. Không envelope khi thành công.', '']
        elif status.startswith('2'):
            md += [f'**Response {status} — mẫu mục tiêu**', '', '```json', dump(content['example']).rstrip(), '```', '']
        else:
            codes = ', '.join(content['examples'])
            md += [f'**Response {status}:** `{codes}`; schema `Error`, JSON mẫu trong OpenAPI.', '']
    err = operation['responses']['409']['content']['application/json']
    md += ['**Mẫu lỗi nghiệp vụ (409)**', '', '```json', dump(next(iter(err['examples'].values()))['value']).rstrip(), '```', '']
(ROOT / 'FLOW3-API-JSON.md').write_text('\n'.join(md), encoding='utf-8')

scenarios = [
    ('parallel-preparation', 'ROAD/AIR sau giao việc', ['deployment=CONFIRMED', 'no feasibility', 'no timed-documents schedule'], ['J06 allowed', 'Flow2 document preparation allowed'], 'Không tuần tự hóa hai nhánh'),
    ('road-submit-missing-confirm', 'ROAD DRAFT đủ tuyến nhưng chưa confirm', ['resourcesConfirmed=null'], ['J08 → 409 RESOURCES_NOT_CONFIRMED'], 'Không gửi ROAD trước bố trí'),
    ('road-happy-path', 'ROAD hai nhánh độc lập', ['J06', 'J28', 'J26', 'J14', 'J08', 'J11 APPROVE', 'J16', 'J17', 'J18'], ['Trip READY_TO_DEPART', 'Request SCHEDULED', 'no DEPARTED'], 'Duyệt phương án khác duyệt khởi hành'),
    ('air-no-booking-before-approval', 'AIR phương án dự kiến', ['J39', 'J06', 'J26', 'J08', 'no booking', 'no resourcesConfirmed'], ['J11 allowed', 'J13 allowed only after approved', 'J14 only after booking'], 'Không vòng lặp book→approve'),
    ('air-happy-path', 'AIR tổng thể và booking bên ngoài', ['J54', 'J39', 'J06', 'J28', 'J26', 'J08', 'J11', 'J13', 'J14', 'J16', 'J17', 'J18'], ['Both ground legs valid', 'Budget+plan approved', 'BOOKED not DEPARTED'], 'Không gọi API hãng bay thật'),
    ('air-budget-only', 'Ngân sách duyệt riêng, tuyến chưa approved', ['J40', 'J41 APPROVE'], ['J13 → 409 PLAN_NOT_APPROVED'], 'Duyệt chi phí không mở booking'),
    ('partner-code-mismatch', 'Mã của partner A nhưng chọn partner B', ['J54 with mismatched partner'], ['409 FLIGHT_PROVIDER_MISMATCH'], 'Không tự chọn đối tác đầu tiên'),
    ('partner-code-ambiguous', 'Một partner nhiều lịch cùng mã', ['J54 ambiguous code'], ['409 FLIGHT_CODE_AMBIGUOUS', 'J05 lists candidates'], 'Chọn serviceId rõ'),
    ('no-provider-match', 'Bên dịch vụ hiện tại không đáp ứng', ['J05 empty'], ['data=[]', 'choose another partner'], 'Không bịa lịch, không auto cancel Trip'),
    ('catalog-changed', 'Đối tác đổi lịch/giá sau approved', ['J13/J11 with old catalogVersion'], ['409 FLIGHT_CATALOG_CHANGED', 'J12 revision required'], 'Giữ snapshot'),
    ('crew-separation', 'AIR dùng chung người/xe hai chặng', ['outbound vehicle/crew reused inbound'], ['409 INVALID_CREW or RESOURCE_CONFLICT'], 'Hai xe sáu người'),
    ('active-trip-resource-race', 'Hai Trip khác nhau tranh cùng xe', ['Concurrent J14 ROAD or J08 AIR'], ['Exactly one transaction succeeds', 'Other 409 RESOURCE_CONFLICT', 'No partial hold'], 'Kiểm ngoài scope danh sách UI'),
    ('care-rest-not-fuel', 'Tới điểm sau 4.1h, trước đó chỉ dừng nhiên liệu', ['careIntervalH=4', 'FUEL no REST'], ['409 CARE_POLICY_VIOLATION'], 'Không reset đồng hồ bằng đổ xăng'),
    ('short-rest-not-recovery', 'Đợt đường bộ 12.1h dù đã nghỉ ngắn', ['roadEpisodeH=12', 'REST 45min onboard'], ['409 CARE_POLICY_VIOLATION'], 'Nghỉ ngắn không reset đợt'),
    ('overnight-opening', 'Cơ sở mở 18:00–06:00, ghé 05:45 trong 45 phút', ['arrival=2026-11-10 05:45', 'dwell=45'], ['Rejected: end=06:30 after close'], 'Kiểm toàn khoảng ghé'),
    ('delivery-deadline', 'ETA vượt cam kết', ['eta=2026-11-13 18:01', 'deadline=2026-11-13 18:00'], ['409 DELIVERY_DEADLINE_EXCEEDED'], 'Reason không vượt deadline'),
    ('pickup-consent', 'Xe không vào được', ['J28 INACCESSIBLE', 'J30 PROPOSED', 'J31 APPROVE', 'J32 consent'], ['ORIGIN unchanged before J32', 'After consent recompute routing', 'Original pickup unchanged'], 'Gửi thông báo không là đồng ý'),
    ('pickup-place-changed', 'Cơ sở đổi sau Manager approve', ['old placeVersion', 'J32'], ['409 PLACE_CHANGED', 're-propose'], 'Không giữ consent cho nơi mới'),
    ('pickup-revision', 'Thay điểm nhận đã CUSTOMER_CONFIRMED', ['J33'], ['Archive consent', 'Clear affected route/confirmation', 'Require new customer confirmation'], 'Không overwrite'),
    ('vehicle-access-limit', 'Xe dài 12m, pickup maxLengthM=10', ['J27'], ['eligible=false', 'VEHICLE_ACCESS_RESTRICTED'], 'Lọc ngay khi chọn xe'),
    ('truck-osrm-only', 'Có OSRM nhưng thiếu truck verification', ['J25', 'J08'], ['409 TRUCK_ROUTE_REQUIRED'], 'OSRM không chứng minh tải trọng cầu'),
    ('provider-down', 'HERE timeout', ['J26'], ['503 ROUTING_UNAVAILABLE', 'No verified fallback'], 'Không success giả'),
    ('demo-isolation', 'Trip thật dùng DEMO routing/booking', ['source=DEMO on non-demo trip'], ['Rejected', 'No READY'], 'Không fixture lên API thật'),
    ('docs-before-plan', 'Specialist đủ giấy/bảo hiểm khi chưa có route', ['J16 before J06'], ['Docs READY permitted', 'Plan changes reevaluate relevant dependencies'], 'Không chờ approved plan'),
    ('empty-checklist', 'Chưa áp bộ yêu cầu, required=0', ['J16'], ['409 DOCS_NOT_READY'], '0/0 không tự đủ'),
    ('ready-independent-versions', 'Docs READY rồi confirm Ops', ['J16', 'J14 increases aggregate version'], ['Docs stays valid if dependencies unchanged'], 'Không bắt stamp version bằng nhau'),
    ('stale-readiness', 'GET readiness rồi đổi staff status', ['J17', 'J49 ON_LEAVE', 'J18 old binding'], ['409 READINESS_CHANGED or STALE_VERSION', 'No departure commit'], 'POST recheck'),
    ('staff-in-transit', 'Cho nghỉ người đang vận chuyển', ['J49 ON_LEAVE', 'active IN_TRANSIT assignment'], ['409 STAFF_IN_TRANSIT', 'Use incident replacement first'], 'Không bỏ crew đang chạy'),
    ('booking-history', 'Thay flight đã BOOKED', ['J12', 'old booking active', 'J11'], ['409 OLD_BOOKING_ACTIVE', 'J20 before approving changed flight'], 'Không overwrite booking'),
    ('booking-deduplication', 'Hai Trip cùng partner và bookingRef khác hoa/thường', ['EQA-BOOK-001', ' eqa-book-001 '], ['409 BOOKING_REFERENCE_DUPLICATE'], 'Khóa unique ở server'),
    ('idempotent-retry', 'Retry cùng key/body', ['J13 repeated'], ['Same response/bookingId', 'No extra booking/history/notifications'], 'Khác body IDEMPOTENCY_CONFLICT'),
    ('scope-and-actor', 'Staff khác Trip hoặc giả actor/status', ['Foreign trip GET/POST', 'actor/status in strict JSON body'], ['404 foreign resource', '400 extra fields', '403 wrong role'], 'JWT quyết định actor'),
    ('file-safety', 'Tệp giả PDF hoặc quá 10MiB', ['J42'], ['400 content mismatch or 415 MIME or 413 too large', 'No file bound to booking'], 'Không object URL là evidence'),
    ('referenced-catalog-delete', 'Xóa place/partner có history reference', ['J38 or J47'], ['409 RECORD_REFERENCED', 'Use status mutation'], 'Không xóa lịch sử'),
    ('late-departure', 'serverNow qua plannedDepart', ['J18'], ['409 READINESS_CHANGED', 'Reschedule via authorized revision workflow'], 'Không duyệt giờ đã qua'),
    ('locked-after-approval', 'Sửa plan sau READY_TO_DEPART', ['J06'], ['409 DEPARTURE_APPROVAL_LOCKED'], 'Không auto unlock'),
    ('driver-map-report', 'Báo tắc đường gắn mốc, không GPS', ['J53'], ['locationSource=MILESTONE_REPORT', 'isGps=false', 'Unknown geo stays null'], 'Không claim realtime traffic'),
]
examples = {'contractVersion': '2.0.0', 'status': 'ACCEPTANCE_TARGETS_NOT_EXECUTED_BACKEND_TESTS',
            'source': 'D:/Shared/Final_Flow3.html', 'road': {'draftRequest': draft_body, 'routing': route},
            'air': {'approvedPlan': air_plan, 'contextAfterApproval': air_context, 'routing': air_route},
            'flightService': flight_service,
            'scenarios': [{'id': key, 'given': given, 'when': when, 'then': then, 'reason': why} for key, given, when, then, why in scenarios]}
(ROOT / 'flow3.examples.json').write_text(dump(examples), encoding='utf-8')
print(f'Generated Flow 3 v2: {len(OPS)} operations, {len(S)} schemas, {len(scenarios)} acceptance scenarios.')
