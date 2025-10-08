import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Footer } from "@/components/layout/Footer";
import logoImage from "@assets/URBAN KETL Logo small_1750439431697.jpg";
import teaFieldsHero from "@assets/stock_images/green_tea_plantation_b7e990d9.jpg";
import gunadeepPhoto from "@assets/Gunadeep Round pic_1759948898072.avif";
import samarPhoto from "@assets/samarpic-round_1759948898076.avif";
import thirthaPhoto from "@assets/thirtha round pic_1759948898078.avif";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>About Us - UrbanKetl | Our Story & Mission</title>
        <meta name="description" content="Learn about UrbanKetl's mission to bring authentic, home-style brewed tea beyond the home. Meet our team and discover our vision for revolutionizing tea consumption." />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl flex-1">
        {/* Logo */}
        <div className="mb-6">
          <Link href="/">
            <img 
              src={logoImage} 
              alt="UrbanKetl Logo" 
              className="h-16 w-auto object-contain border border-gray-200 rounded-lg p-1 bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              style={{ minWidth: '80px', height: '64px', maxWidth: '120px' }}
            />
          </Link>
        </div>

        {/* Get to know us section */}
        <section className="mb-16">
          <h1 className="text-4xl font-bold text-tea-green mb-6">Get to know us</h1>
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              At <strong>UrbanKetl</strong>, we set out to bring authentic, home-style brewed tea beyond the home. While coffee had premium, on-the-go options, tea lovers were left with subpar alternatives.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Our innovative tea dispensing system ensures every cup is freshly brewed, balancing aroma, taste, and warmth—without compromise. Whether at work, commuting, or on a quick break, <strong>UrbanKetl</strong> delivers the comfort of great tea, anytime, anywhere.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              Because tea isn't a luxury—it's an everyday delight.
            </p>
          </div>

          {/* Hero image */}
          <div className="mb-6 rounded-xl overflow-hidden shadow-lg">
            <img 
              src={teaFieldsHero} 
              alt="Tea plantation fields" 
              className="w-full h-[400px] object-cover"
            />
          </div>
        </section>

        {/* Mission and Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-tea-green">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Our mission is to provide a premium, on-the-go tea experience that preserves the rich flavors, aroma, and warmth of traditionally brewed tea. Through innovation and quality craftsmanship, we aim to redefine tea consumption outside the home, making it as effortless and satisfying as enjoying a cup brewed with care at home.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-tea-green">Our Vision</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                To revolutionize the tea experience by making high-quality, home-style brewed tea accessible to everyone, anywhere, anytime. We aspire to bridge the gap between convenience and authenticity, ensuring that every tea lover enjoys a perfect cup without compromise.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Our Team */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-tea-green mb-4">Our Team</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            Our strength lies in our individuality. Set up by Samarjit, the team strives to bring in the best talent in various fields, from Engineering to design and sales.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Team Member 1 - Samarjit */}
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 flex flex-col items-center">
                <div className="w-48 h-48 rounded-full overflow-hidden mb-4">
                  <img 
                    src={samarPhoto} 
                    alt="Samarjit Banerjea" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-tea-green mb-1">Samarjit Banerjea</h3>
                  <p className="text-gray-600">Co-founder, CEO</p>
                </div>
              </CardContent>
            </Card>

            {/* Team Member 2 - Thirtha */}
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 flex flex-col items-center">
                <div className="w-48 h-48 rounded-full overflow-hidden mb-4">
                  <img 
                    src={thirthaPhoto} 
                    alt="Thirtha Prasad" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-tea-green mb-1">Thirtha Prasad</h3>
                  <p className="text-gray-600">CO-Founder, CTO</p>
                </div>
              </CardContent>
            </Card>

            {/* Team Member 3 - Gunadeep */}
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 flex flex-col items-center">
                <div className="w-48 h-48 rounded-full overflow-hidden mb-4">
                  <img 
                    src={gunadeepPhoto} 
                    alt="Gunadeep P N" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-tea-green mb-1">Gunadeep P N</h3>
                  <p className="text-gray-600">Director - Growth & Investment</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
