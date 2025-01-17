import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @Column({ unique: true })
    email!: string;

    @Column()
    password!: string;

    @Column({
        type: "enum",
        enum: ["customer", "provider", "admin"],
        default: "customer"
    })
    role!: string;

    @Column({
        type: "point",
        nullable: true,
        transformer: {
            to: (value: { lat: number; lng: number } | null) => {
                if (!value) return null;
                return `(${value.lng},${value.lat})`;
            },
            from: (value: any) => {
                if (!value) return null;
                if (typeof value === "string") {
                    const [lng, lat] = value.slice(1, -1).split(",").map(Number);
                    return { lat, lng };
                }
                if (value.x !== undefined && value.y !== undefined) {
                    return { lat: value.y, lng: value.x };
                }
                return null;
            }
        }
    })
    location?: { lat: number; lng: number };

    @Column("simple-array", { nullable: true })
    services?: string[];

    @Column({ nullable: true })
    phoneNumber?: string;

    @Column({ nullable: true })
    businessName?: string;

    @Column({ default: true })
    isAvailable!: boolean;
} 