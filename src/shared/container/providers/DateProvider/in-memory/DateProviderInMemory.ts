import { IDateProvider } from "../IDateProvider";

class DateProviderInMemory implements IDateProvider {
  compareInHours(start_date: Date, end_date: Date): number {
    return (end_date.getTime() - start_date.getTime()) / (1000 * 60 * 60);
  }
  convertToUTC(date: Date): string {
    return date.toISOString();
  }
  dateNow(): Date {
    return new Date();
  }
  compareInDays(start_date: Date, end_date: Date): number {
    return (end_date.getTime() - start_date.getTime()) / (1000 * 60 * 60 * 24);
  }
  addDays(days: number): Date {
    const now = new Date();
    now.setDate(now.getDate() + days);
    return now;
  }
  addHours(hours: number): Date {
    const now = new Date();
    now.setHours(now.getHours() + hours);
    return now;
  }
  compareIfBefore(start_date: Date, end_date: Date): boolean {
    return start_date < end_date;
  }
}

export { DateProviderInMemory };