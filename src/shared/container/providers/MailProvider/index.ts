import { container } from "tsyringe";

import { IMailProvider } from "./IMailProvider";
import { EtherealMailProvider } from "./implementations/EtherealMailProvider";
import { SESMailProvider } from "./implementations/SESMailProvider";
type MailProviderTypes = "ethereal" | "ses";

const mailProvider = {
  ethereal: container.resolve(EtherealMailProvider),
  ses: container.resolve(SESMailProvider),
};

const mailProviderKey = process.env.MAIL_PROVIDER as MailProviderTypes;

container.registerInstance<IMailProvider>(
  "MailProvider",
  mailProvider[mailProviderKey]
);
