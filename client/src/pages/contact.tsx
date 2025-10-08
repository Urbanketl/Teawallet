import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Building2, ExternalLink } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import logoImage from "@assets/URBAN KETL Logo small_1750439431697.jpg";

export default function ContactUs() {
  const phoneNumber = "9620963007";
  const email = "contact@urbanketl.com";
  const companyName = "IECX FOOD TECHNOLOGY PRIVATE LIMITED";
  const address = "WorkFlo Ranka junction, Property No. 224, 3rd Floor, #80/3, VIJINAPUR VILLAGE, OLD MADRAS ROAD, KR PURAM, HOBLI, Krishnarajapuram R S, Bangalore, Bangalore North, Karnataka, India, 560016";

  return (
    <>
      <Helmet>
        <title>Contact Us - UrbanKetl</title>
        <meta name="description" content="Get in touch with UrbanKetl. Contact us for support, inquiries, or business partnerships." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-tea-light via-white to-tea-lighter">
        <div className="container mx-auto px-4 py-12">
          {/* Logo */}
          <div className="mb-8">
            <Link href="/">
              <img 
                src={logoImage} 
                alt="UrbanKetl Logo" 
                className="h-16 w-auto object-contain border border-gray-200 rounded-lg p-1 bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                style={{ minWidth: '80px', height: '64px', maxWidth: '120px' }}
              />
            </Link>
          </div>
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Have questions or need support? We're here to help you with all your tea dispensing needs.
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Information Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-tea-green">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
                <CardDescription>Official business details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-tea-green mb-1">Company Name</p>
                  <p className="text-base font-semibold text-gray-900">{companyName}</p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-tea-green">
                  <Phone className="h-5 w-5" />
                  Get in Touch
                </CardTitle>
                <CardDescription>Reach us through these channels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-tea-green mb-2">Phone</p>
                  <a 
                    href={`tel:${phoneNumber}`}
                    className="flex items-center gap-2 text-base font-semibold text-tea-green hover:text-tea-dark transition-colors"
                    data-testid="link-phone"
                  >
                    <Phone className="h-4 w-4" />
                    {phoneNumber}
                  </a>
                </div>

                <div>
                  <p className="text-sm font-medium text-tea-green mb-2">Email</p>
                  <a 
                    href={`mailto:${email}`}
                    className="flex items-center gap-2 text-base font-semibold text-tea-green hover:text-tea-dark transition-colors"
                    data-testid="link-email"
                  >
                    <Mail className="h-4 w-4" />
                    {email}
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Address Card - Full Width */}
            <Card className="shadow-lg md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-tea-green">
                  <MapPin className="h-5 w-5" />
                  Office Address
                </CardTitle>
                <CardDescription>Visit us at our office</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-base text-gray-700 leading-relaxed">
                  {address}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 font-semibold text-tea-green hover:text-tea-dark transition-colors"
                  data-testid="link-map"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Google Maps
                </a>
              </CardContent>
            </Card>

            {/* Business Hours Card */}
            <Card className="shadow-lg md:col-span-2">
              <CardHeader>
                <CardTitle className="text-tea-green">Business Hours</CardTitle>
                <CardDescription>We're available during these times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Monday - Friday</p>
                    <p className="text-base text-gray-900">9:00 AM - 6:00 PM IST</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Saturday - Sunday</p>
                    <p className="text-base text-gray-900">Closed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Back to Home Button */}
          <div className="text-center mt-12">
            <Link href="/">
              <Button 
                variant="outline" 
                size="lg"
                className="shadow-md"
                data-testid="button-back-home"
              >
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
