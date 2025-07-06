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
exports.Provider = void 0;
const typeorm_1 = require("typeorm");
let Provider = class Provider {
};
exports.Provider = Provider;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid") // Use UUID as the primary key
    ,
    __metadata("design:type", String)
], Provider.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)("text"),
    __metadata("design:type", String)
], Provider.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)("text"),
    __metadata("design:type", String)
], Provider.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)("text"),
    __metadata("design:type", String)
], Provider.prototype, "business_name", void 0);
__decorate([
    (0, typeorm_1.Column)("geometry", { nullable: true }) // Assuming location is a PostGIS geometry type
    ,
    __metadata("design:type", Object)
], Provider.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Provider.prototype, "is_available", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { array: true }) // Assuming services is an array of text
    ,
    __metadata("design:type", Array)
], Provider.prototype, "services", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: "timestamp without time zone" }),
    __metadata("design:type", Date)
], Provider.prototype, "last_updated", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: "timestamp without time zone" }),
    __metadata("design:type", Date)
], Provider.prototype, "created_at", void 0);
exports.Provider = Provider = __decorate([
    (0, typeorm_1.Entity)("providers") // Name of the table in the database
], Provider);
