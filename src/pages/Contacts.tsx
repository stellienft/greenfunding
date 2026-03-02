import React from 'react';
import { Layout } from '../components/Layout';
import { Mail, Phone, MapPin, Globe, MessageCircle } from 'lucide-react';

export function Contacts() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#3A475B] mb-2">Contact Us</h1>
            <p className="text-gray-600">Get in touch with the Green Funding team</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <div className="bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F] w-14 h-14 rounded-full flex items-center justify-center mb-6">
                <Mail className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#3A475B] mb-3">Email Support</h3>
              <p className="text-gray-600 mb-4">
                Send us an email and we'll get back to you within 24 hours
              </p>
              <a
                href="mailto:solutions@greenfunding.com.au"
                className="text-[#6EAE3C] hover:underline font-semibold"
              >
                solutions@greenfunding.com.au
              </a>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <div className="bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F] w-14 h-14 rounded-full flex items-center justify-center mb-6">
                <Phone className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#3A475B] mb-3">Phone Support</h3>
              <p className="text-gray-600 mb-4">
                Call us during business hours for immediate assistance
              </p>
              <a
                href="tel:1300403100"
                className="text-[#6EAE3C] hover:underline font-semibold text-lg"
              >
                1300 403 100
              </a>
              <p className="text-sm text-gray-500 mt-2">
                Mon-Fri: 9:00 AM - 5:00 PM AEST
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <div className="bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F] w-14 h-14 rounded-full flex items-center justify-center mb-6">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#3A475B] mb-3">Office Address</h3>
              <p className="text-gray-600">
                Green Funding<br />
                Level 18, 324 Queen Street<br />
                Brisbane QLD 4000<br />
                Australia
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <div className="bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F] w-14 h-14 rounded-full flex items-center justify-center mb-6">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#3A475B] mb-3">Website</h3>
              <p className="text-gray-600 mb-4">
                Visit our website for more information about our services
              </p>
              <a
                href="https://greenfunding.com.au"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#6EAE3C] hover:underline font-semibold"
              >
                greenfunding.com.au
              </a>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F] rounded-2xl shadow-lg p-8 text-white">
            <div className="flex items-start gap-4">
              <MessageCircle className="w-8 h-8 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-2xl font-bold mb-3">Need Technical Support?</h3>
                <p className="mb-4 text-white/90">
                  If you're experiencing technical issues with the portal or have questions about using the calculator,
                  our support team is here to help. Contact us using any of the methods above and we'll assist you
                  as soon as possible.
                </p>
                <ul className="space-y-2 text-white/90">
                  <li className="flex items-start gap-2">
                    <span className="text-white font-bold">•</span>
                    <span>Account and login issues</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white font-bold">•</span>
                    <span>Calculator functionality questions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white font-bold">•</span>
                    <span>Application submission help</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white font-bold">•</span>
                    <span>Document upload assistance</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
