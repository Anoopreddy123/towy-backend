import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";

export enum ServiceType {
    TOWING = "towing",
    GAS_DELIVERY = "gas_delivery",
    MECHANIC = "mechanic",
    BATTERY_JUMP = "battery_jump",
    TIRE_CHANGE = "tire_change",
    LOCKOUT = "lockout"
}

@Entity()
export class ServiceRequest {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User)
    user!: User;

    @Column({
        type: "enum",
        enum: ServiceType,
        default: ServiceType.TOWING
    })
    serviceType!: ServiceType;

    @Column()
    location!: string;

    @Column()
    vehicleType!: string;

    @Column({
        type: "enum",
        enum: ["pending", "accepted", "in_progress", "completed", "cancelled"],
        default: "pending"
    })
    status!: string;

    @Column({ nullable: true })
    description?: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    quotedPrice?: number;

    @ManyToOne(() => User, { nullable: true })
    provider?: User;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column({
        type: 'point',
        nullable: true,
        transformer: {
            to: (value: { lat: number; lng: number } | null) => {
                if (!value) return null;
                return `(${value.lng},${value.lat})`;
            },
            from: (value: any) => {
                if (!value) return null;
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
    })
    coordinates?: { lat: number; lng: number };

    @Column('simple-array', { nullable: true })
    notifiedProviders?: string[];
} 