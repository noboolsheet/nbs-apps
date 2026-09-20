import { ResumeData } from './types';

export const defaultResumeData: ResumeData = {
  id: 'maria-fernanda-cv',
  name: 'Curriculum Principal',
  personalDetails: {
    fullName: 'MARIA FERNANDA ARTIGAS HEROLD',
    jobTitle: 'Junior Software Development, AI-first',
    phone: '+393516337160',
    email: 'mfaherold1998@gmail.com',
    dateOfBirth: '12/19/1998',
    placeOfBirth: 'Cuba',
    currentResidence: 'Cosenza, Italy',
    summary: 'As a dedicated computer technician and marketing enthusiast with experience in website development and social media management, I am eager to bring my skills to your team. My passion for training and the creation of custom products with AI drives my desire to contribute effectively. I am excited about the opportunity to collaborate, innovate, and help elevate your organization\'s digital presence and initiatives.'
  },
  experience: [
    {
      id: 'exp-1',
      jobTitle: 'Computer Technician',
      company: 'UAI-UTCS Unione Turismo Commercio Servizi',
      location: 'Cosenza, Italy',
      startDate: 'Apr 2026',
      endDate: 'Current',
      description: 'Creation (frontend and backend), administration, and maintenance of websites for the company\'s activities; the creation and maintenance of internal structures and services; and the management and maintenance of social media and marketing.'
    },
    {
      id: 'exp-2',
      jobTitle: 'Marketing, Social Media Manager and e-commerce management',
      company: 'Automotive sector',
      location: 'Rende, Cosenza',
      startDate: 'Jan 2026',
      endDate: 'Mar 2026',
      description: 'Management of the company\'s social media channels; development of marketing strategies and content creation; and management of e-commerce on different platforms, specifically eBay and TikTok Shop.'
    },
    {
      id: 'exp-3',
      jobTitle: 'Online Training Courses',
      company: 'Tempza Formazione',
      location: 'Cosenza',
      startDate: 'Nov 2024',
      endDate: 'Sep 2025',
      description: 'Online lessons for elementary and secondary school students and teachers from kindergarten to high school on artificial intelligence and how to integrate it into work.'
    },
    {
      id: 'exp-4',
      jobTitle: 'Internal Professor at the university',
      company: 'Orient University',
      location: 'Stgo, Cuba',
      startDate: 'Jan 2022',
      endDate: 'Sep 2022',
      description: 'Teaching lessons in related computer science courses: basic programming, databases, and design patterns.'
    }
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'Laurea Magistrale, Computer Science: Data Science and Artificial Intelligence',
      school: 'Università della Calabria',
      location: 'Cosenza, Italy',
      startDate: 'Oct 2022',
      endDate: 'Apr 2026',
      description: 'Master\'s studies in the Department of Computer Science and Mathematics at the University of Calabria, focused on data analysis and artificial intelligence. Notable courses: Statistics, Deep Learning, and Big Data.'
    },
    {
      id: 'edu-2',
      degree: 'Laurea Triennale, Santiago de Cuba',
      school: 'Universidad de Oriente',
      location: 'Santiago de Cuba, Cuba',
      startDate: 'Sep 2016',
      endDate: 'Dec 2021',
      description: 'A computer science degree focuses on the analysis and creation of algorithms and lasts 5 years.'
    }
  ],
  skills: [
    { id: 'skill-1', name: 'Junior Software Development, AI-first' },
    { id: 'skill-2', name: 'Website Creation and Maintenance' },
    { id: 'skill-3', name: 'Social media administration and management' },
    { id: 'skill-4', name: 'Problem Solving' },
    { id: 'skill-5', name: 'Analytical Thinking' }
  ],
  languages: [
    { id: 'lang-1', name: 'Spanish', level: 5 },
    { id: 'lang-2', name: 'Italian', level: 4 },
    { id: 'lang-3', name: 'English', level: 2 }
  ],
  updatedAt: new Date().toISOString()
};
