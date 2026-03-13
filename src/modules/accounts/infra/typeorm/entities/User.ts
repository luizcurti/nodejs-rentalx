import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";
import { Expose } from "class-transformer";
import { v4 as uuidV4 } from "uuid";

@Entity("users")
class User {
  @PrimaryColumn()
  id!: string;

  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column()
  password!: string;

  @Column()
  driver_license!: string;

  @Column()
  isAdmin!: boolean;

  @Column()
  avatar!: string;

  @CreateDateColumn()
  created_at!: Date;

  constructor() {
    if (!this.id) {
      this.id = uuidV4();
    }
  }
  
  @Expose({ name: "avatar_url" })
  avatar_url(): string | null  {
    switch (process.env.disk) {
      case "local":
        return this.avatar ? `${process.env.APP_API_URL}/avatar/${this.avatar}` : null;
      case "s3":
        return this.avatar ? `${process.env.AWS_BUCKET_URL}/avatar/${this.avatar}` : null;
      default:
        return null;
    }
  }


}

export { User };
