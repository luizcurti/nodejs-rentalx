import { IMailProvider } from "../IMailProvider";

class MailProviderInMemory implements IMailProvider {
  private message: Array<{
    to: string;
    subject: string;
    variables: Record<string, unknown>;
    path: string;
  }> = [];

  async sendMail(
    to: string,
    subject: string,
    variables: Record<string, unknown>,
    path: string
  ): Promise<void> {
    this.message.push({
      to,
      subject,
      variables,
      path,
    });
  }
}

export { MailProviderInMemory };
