const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Company = require('./models/Company');
const Job = require('./models/Job');

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Clear existing data
        await User.deleteMany({});
        await Company.deleteMany({});
        await Job.deleteMany({});
        console.log('Data Cleared');

        // Create Employers
        const password = await bcrypt.hash('password123', 12);

        const employer1 = await User.create({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@techcorp.com',
            password: 'password123', // Will be hashed by pre-save hook
            userType: 'employer',
            isVerified: true
        });

        const employer2 = await User.create({
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@designstudio.com',
            password: 'password123',
            userType: 'employer',
            isVerified: true
        });

        console.log('Employers Created');

        // Create Companies
        const company1 = await Company.create({
            name: 'TechCorp Nepal',
            description: 'Leading technology solutions provider in Nepal, specializing in AI and cloud computing. We are a team of passionate innovators dedicated to transforming the digital landscape of the Himalayas.',
            email: 'contact@techcorp.com',
            website: 'https://techcorp.com',
            address: {
                street: 'Lazimpat',
                city: 'Kathmandu',
                country: 'Nepal'
            },
            industry: 'Technology',
            companySize: '51-200',
            foundedYear: 2015,
            owner: employer1._id,
            isActive: true,
            isVerified: true,
            rating: { overall: 4.5 }
        });

        const company2 = await Company.create({
            name: 'Creative Design Studio',
            description: 'A creative agency focused on branding, UI/UX, and digital marketing. We bring ideas to life with stunning visuals and compelling storytelling.',
            email: 'hello@designstudio.com',
            website: 'https://designstudio.com',
            address: {
                street: 'Jhamsikhel',
                city: 'Lalitpur',
                country: 'Nepal'
            },
            industry: 'Other',
            companySize: '11-50',
            foundedYear: 2018,
            owner: employer2._id,
            isActive: true,
            isVerified: true,
            rating: { overall: 4.8 }
        });

        // Update employers with company IDs
        employer1.company = company1._id;
        await employer1.save();
        employer2.company = company2._id;
        await employer2.save();

        console.log('Companies Created');

        // Helper to generate slug
        const generateSlug = (title) => {
            return title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 8);
        };

        // Create Jobs
        const jobsData = [
            {
                title: 'Senior Full Stack Developer',
                description: 'We are looking for an experienced Full Stack Developer to join our core team. You will be responsible for building scalable web applications using MERN stack.',
                requirements: 'Minimum 5 years of experience with Node.js and React. Strong understanding of database design and API development.',
                responsibilities: 'Lead the development of new features. Mentor junior developers. Code review and optimization.',
                jobType: 'full-time',
                category: 'Technology',
                experienceLevel: 'senior',
                salary: { min: 150000, max: 250000, currency: 'NPR' },
                location: { city: 'Kathmandu', country: 'Nepal', isRemote: true },
                company: company1._id,
                postedBy: employer1._id,
                applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                requiredSkills: ['React', 'Node.js', 'MongoDB', 'AWS'],
                benefits: ['Health Insurance', 'Remote Work', 'Stock Options']
            },
            {
                title: 'UI/UX Designer',
                description: 'Join our creative team to design beautiful and intuitive user interfaces. You will work closely with product managers and developers.',
                requirements: 'Portfolio demonstrating strong UI/UX skills. Proficiency in Figma and Adobe Creative Suite.',
                responsibilities: 'Create wireframes, prototypes, and high-fidelity mockups. Conduct user research and usability testing.',
                jobType: 'full-time',
                category: 'Design',
                experienceLevel: 'mid',
                salary: { min: 80000, max: 120000, currency: 'NPR' },
                location: { city: 'Lalitpur', country: 'Nepal' },
                company: company2._id,
                postedBy: employer2._id,
                applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                requiredSkills: ['Figma', 'Adobe XD', 'Prototyping'],
                benefits: ['Flexible Hours', 'Creative Environment', 'Free Lunch']
            },
            {
                title: 'Junior DevOps Engineer',
                description: 'Start your career in DevOps with TechCorp. We provide training and mentorship.',
                requirements: 'Basic knowledge of Linux and cloud platforms. Willingness to learn.',
                responsibilities: 'Assist in CI/CD pipeline management. Monitor system performance.',
                jobType: 'full-time',
                category: 'Technology',
                experienceLevel: 'entry',
                salary: { min: 40000, max: 60000, currency: 'NPR' },
                location: { city: 'Kathmandu', country: 'Nepal' },
                company: company1._id,
                postedBy: employer1._id,
                applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                requiredSkills: ['Linux', 'Docker', 'Bash'],
                benefits: ['Training', 'Mentorship']
            },
            {
                title: 'Marketing Manager',
                description: 'Lead our marketing efforts and grow our brand presence.',
                requirements: '3+ years in digital marketing. Proven track record of successful campaigns.',
                responsibilities: 'Develop marketing strategies. Manage social media channels.',
                jobType: 'full-time',
                category: 'Marketing',
                experienceLevel: 'mid',
                salary: { min: 100000, max: 150000, currency: 'NPR' },
                location: { city: 'Lalitpur', country: 'Nepal' },
                company: company2._id,
                postedBy: employer2._id,
                applicationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
                requiredSkills: ['SEO', 'Content Marketing', 'Analytics'],
                benefits: ['Performance Bonus', 'Travel Allowance']
            },
            {
                title: 'Freelance Content Writer',
                description: 'Write engaging content for our blog and social media.',
                requirements: 'Excellent writing skills in English and Nepali.',
                responsibilities: 'Produce 2-3 articles per week.',
                jobType: 'freelance',
                category: 'Marketing',
                experienceLevel: 'entry',
                salary: { min: 10000, max: 20000, currency: 'NPR' },
                location: { city: 'Remote', country: 'Nepal', isRemote: true },
                company: company2._id,
                postedBy: employer2._id,
                applicationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                requiredSkills: ['Copywriting', 'SEO'],
                benefits: ['Flexible Schedule']
            }
        ];

        const createdJobs = [];
        for (const jobData of jobsData) {
            const job = new Job(jobData);
            await job.save();
            createdJobs.push(job);
        }
        console.log('Jobs Created');

        // Create Job Seeker
        const jobSeeker = await User.create({
            firstName: 'Rahul',
            lastName: 'Sharma',
            email: 'rahul@example.com',
            password: 'password123',
            userType: 'job_seeker',
            isVerified: true,
            skills: ['JavaScript', 'React', 'Node.js'],
            experience: 'mid',
            location: { city: 'Kathmandu', country: 'Nepal' }
        });
        console.log('Job Seeker Created');

        // Create Applications
        const Application = require('./models/Application');
        await Application.deleteMany({});

        const applications = [
            {
                job: createdJobs[0]._id, // Senior Full Stack Developer
                applicant: jobSeeker._id,
                coverLetter: 'I am very interested in this position. I have 5 years of experience...',
                status: 'pending',
                appliedAt: new Date()
            },
            {
                job: createdJobs[1]._id, // UI/UX Designer
                applicant: jobSeeker._id,
                coverLetter: 'Here is my portfolio link...',
                status: 'under review',
                appliedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
        ];

        await Application.insertMany(applications);
        console.log('Applications Created');

        // Create Reviews
        const Review = require('./models/Review');
        await Review.deleteMany({});

        const reviews = [
            {
                company: company1._id,
                reviewer: jobSeeker._id,
                rating: {
                    overall: 4.5,
                    workLifeBalance: 4,
                    culture: 5,
                    careerOpportunities: 4,
                    compensation: 5,
                    management: 4
                },
                title: 'Great place to work!',
                pros: 'Excellent work culture, competitive salary, and great learning opportunities. The team is very supportive and collaborative.',
                cons: 'Sometimes the workload can be heavy during peak seasons.',
                advice: 'Be prepared to learn and grow. Take initiative on projects.',
                jobTitle: 'Software Engineer',
                employmentStatus: 'current',
                helpful: 12
            },
            {
                company: company2._id,
                reviewer: jobSeeker._id,
                rating: {
                    overall: 4.8,
                    workLifeBalance: 5,
                    culture: 5,
                    careerOpportunities: 4,
                    compensation: 4,
                    management: 5
                },
                title: 'Amazing creative environment',
                pros: 'Very creative and flexible work environment. Management truly cares about work-life balance. Great benefits.',
                cons: 'Could offer more training programs for skill development.',
                advice: 'If you love creativity and design, this is the perfect place.',
                jobTitle: 'UI Designer',
                employmentStatus: 'former',
                helpful: 8
            }
        ];

        await Review.insertMany(reviews);
        console.log('Reviews Created');

        // Update company stats
        company1.stats.activeJobs = 2;
        company1.stats.totalApplications = 1;
        await company1.save();

        company2.stats.activeJobs = 3;
        company2.stats.totalApplications = 1;
        await company2.save();

        // Update Job stats
        const job1 = await Job.findById(createdJobs[0]._id);
        job1.stats.applications = 1;
        await job1.save();

        const job2 = await Job.findById(createdJobs[1]._id);
        job2.stats.applications = 1;
        await job2.save();

        console.log('Database Seeded Successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
