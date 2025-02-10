import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { v4 as uuidv4 } from 'uuid';

@Entity("providers") // Name of the table in the database
export class Provider {
    @PrimaryGeneratedColumn("uuid") // Use UUID as the primary key
    id: string;

    @Column("text")
    email!: string;

    @Column("text")
    password!: string;

    @Column("text")
    business_name!:string;

    @Column("geometry", { nullable: true }) // Assuming location is a PostGIS geometry type
    location!: { type: string; coordinates: number[] }; // Adjust based on your actual location structure

    @Column({ default: true })
    is_available!: boolean;

    @Column("text", { array: true }) // Assuming services is an array of text
    services!: string[];

    @UpdateDateColumn({ type: "timestamp without time zone" })
    last_updated!: Date;

    @CreateDateColumn({ type: "timestamp without time zone" })
    created_at!: Date;

    constructor() {
        this.id = uuidv4(); // Automatically generate a UUID for new providers
    }
} 