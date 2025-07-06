"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRequest = exports.ServiceType = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
var ServiceType;
(function (ServiceType) {
    ServiceType["TOWING"] = "towing";
    ServiceType["GAS_DELIVERY"] = "gas_delivery";
    ServiceType["MECHANIC"] = "mechanic";
    ServiceType["BATTERY_JUMP"] = "battery_jump";
    ServiceType["TIRE_CHANGE"] = "tire_change";
    ServiceType["LOCKOUT"] = "lockout";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
let ServiceRequest = class ServiceRequest {
};
exports.ServiceRequest = ServiceRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ServiceRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    __metadata("design:type", User_1.User)
], ServiceRequest.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ServiceType,
        default: ServiceType.TOWING
    }),
    __metadata("design:type", String)
], ServiceRequest.prototype, "serviceType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ServiceRequest.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ServiceRequest.prototype, "vehicleType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["pending", "accepted", "in_progress", "completed", "cancelled"],
        default: "pending"
    }),
    __metadata("design:type", String)
], ServiceRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ServiceRequest.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], ServiceRequest.prototype, "quotedPrice", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    __metadata("design:type", User_1.User)
], ServiceRequest.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ServiceRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ServiceRequest.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'point',
        nullable: true,
        transformer: {
            to: (value) => {
                if (!value)
                    return null;
                return `(${value.lng},${value.lat})`;
            },
            from: (value) => {
                if (!value)
                    return null;
                // Handle both string and object formats
                if (typeof value === 'string') {
                    const [lng, lat] = value.slice(1, -1).split(',').map(Number);
                    return { lat, lng };
                }
                // Handle PostgreSQL point format
                if (value.x !== undefined && value.y !== undefined) {
                    return { lat: value.y, lng: value.x };
                }
                return null;
            }
        }
    }),
    __metadata("design:type", Object)
], ServiceRequest.prototype, "coordinates", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], ServiceRequest.prototype, "notifiedProviders", void 0);
exports.ServiceRequest = ServiceRequest = __decorate([
    (0, typeorm_1.Entity)()
], ServiceRequest);
