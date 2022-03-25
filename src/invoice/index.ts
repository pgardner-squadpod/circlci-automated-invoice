import * as fs from 'fs';
import * as https from 'https';
import { config } from 'dotenv';
import * as nodemailer from 'nodemailer';
import SMTPTransport = require('nodemailer/lib/smtp-transport');
import Mail = require('nodemailer/lib/mailer');

enum Currencies {
    usd = "USD",
    jpy = "JPY",
    gbp = "GBP"
}

enum PaymentTerms {
    due = "Due for payment",
    paid = "Paid in full"
}

type InvoiceItem = {
    name: string,
    quantity: number,
    unit_cost: number
}

type InvoiceData = {
    logo: string,
    from: string,
    to: string,
    currency: Currencies,
    number: string,
    payment_terms: PaymentTerms,
    items: InvoiceItem[],
    fields: { [key: string]: any }
    tax: number,
    notes: string,
    terms: string
}

class Invoice {

    public constructor(invoiceData: InvoiceData, fileName: string) {
        config();
        if (!process.env.MAILTRAP_USERNAME || !process.env.MAILTRAP_PASSWORD) throw new Error('Mailtrap config not set!');

        this.fileName = fileName;
        this.data = invoiceData;
    }

    private fileName: string;
    private data: InvoiceData

    public send(): void {
        const postData: string = JSON.stringify(this.data);
        const requestOptions = {
            hostname: "invoice-generator.com",
            port: 443,
            path: "/",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postData),
            },
        };

        const file = fs.createWriteStream(this.fileName);
        const successHandler = this.successHandler;
        const fileName = this.fileName;
        const sendEmail = this.sendEmail;

        const req = https.request(requestOptions, function (res) {
            res
                .on("data", chunk => file.write(chunk))
                .on("end", () => {
                    file.end();
                    successHandler(fileName);
                    sendEmail(fileName);
                });
        });
        req.write(postData);
        req.end();
        req.on("error", this.errorHandler);
    }

    private successHandler(fileName: string): void { console.info(`Saved invoice to ${fileName}`); }
    private errorHandler(err: Error): void { console.error(err); }
    private async sendEmail(fileName: string): Promise<void> {
        const smtpTransportOptions: SMTPTransport.Options = {
            host: "smtp.mailtrap.io",
            port: 2525,
            auth: {
                user: process.env.MAILTRAP_USERNAME,
                pass: process.env.MAILTRAP_PASSWORD,
            },
        };

        const transport = nodemailer.createTransport(smtpTransportOptions);
        const mailOptions: Mail.Options = {
            from: "invoice@me.com",
            to: "sample@me.com",
            subject: "Invoice for weekly payments via Node.js",
            text: "Find attached the weekly invoice from me. Thanks",
            attachments: [ { path: fileName } ]
        };
        try {
            const sendMailResult = await transport.sendMail(mailOptions);
            if (sendMailResult.accepted && sendMailResult.accepted.length) console.info(`Email sent: ${sendMailResult.response}`)
            if (sendMailResult.rejected && sendMailResult.rejected.length) console.error(`Email not sent: ${sendMailResult.response}`)
        } catch(error) {
            console.info('Error sending email', error);
        }
    }
}

const invoiceData: InvoiceData = {
    logo: "http://invoiced.com/img/logo-invoice.png",
    from: "Invoiced\n701 Brazos St\nAustin, TX 78748",
    to: "Awesome Company / Client",
    currency: Currencies["usd"],
    number: "INV-0001",
    payment_terms: PaymentTerms["due"],
    items: [
        {
            name: "Weekly technical content",
            quantity: 1,
            unit_cost: 500,
        },
        {
            name: "Employee Portal Management",
            quantity: 1,
            unit_cost: 1000,
        },
    ],
    fields: { tax: "%" },
    tax: 5,
    notes: "Thanks for being an awesome customer!",
    terms: "Looking forward to the payments",
};
const invoiceFileName: string = "invoice.pdf";


export const invoice = new Invoice(invoiceData, invoiceFileName);

// const generateInvoice = (invoice, filename, success, error) => {
//     var postData = JSON.stringify(invoice);
//     var options = {
//         hostname: "invoice-generator.com",
//         port: 443,
//         path: "/",
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json",
//             "Content-Length": Buffer.byteLength(postData),
//         },
//     };

//     var file = fs.createWriteStream(filename);

//     var req = https.request(options, function (res) {
//         res
//             .on("data", function (chunk) {
//                 file.write(chunk);
//             })
//             .on("end", function () {
//                 file.end();

//                 if (typeof success === "function") {
//                     success();
//                 }
//             });
//     });
//     req.write(postData);
//     req.end();

//     if (typeof error === "function") {
//         req.on("error", error);
//     }
// };



// generateInvoice(
//     invoice,
//     "invoice.pdf",
//     () => console.log("Saved invoice to invoice.pdf"),
//     (err) => console.log(err)
// );



// 60 mag
// 200 pot
// 1000