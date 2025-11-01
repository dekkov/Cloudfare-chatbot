/**
 * Script to ingest resume data into the portfolio chatbot
 * This converts the resume JSON into PortfolioContent items and sends them to the worker
 */

import * as fs from 'fs';
import * as path from 'path';

interface PortfolioContent {
	id: string;
	type: 'personal' | 'education' | 'work' | 'project' | 'skill';
	text: string;
	metadata: {
		title?: string;
		company?: string;
		period?: string;
		technologies?: string[];
		[key: string]: any;
	};
}

async function ingestResume() {
	// Read resume data
	const resumePath = path.join(__dirname, '../data/resume.json');
	const resumeData = JSON.parse(fs.readFileSync(resumePath, 'utf-8'));

	const contents: PortfolioContent[] = [];

	// 1. Personal Information
	const personal = resumeData.personal;
	contents.push({
		id: 'personal_info',
		type: 'personal',
		text: `${personal.name} is based in ${personal.location}. Contact: ${personal.email}, Phone: ${personal.phone}. LinkedIn: ${personal.linkedin}, GitHub: ${personal.github}`,
		metadata: {
			title: 'Personal Information',
			...personal,
		},
	});

	// 2. Education
	const edu = resumeData.education;
	contents.push({
		id: 'education',
		type: 'education',
		text: `Education: ${edu.degree} from ${edu.university}, graduating ${edu.graduation} with GPA ${edu.gpa}. Honors: ${edu.honors.join(', ')}. Relevant coursework includes: ${edu.coursework.join(', ')}.`,
		metadata: {
			title: 'Education',
			...edu,
		},
	});

	// 3. Work Experience
	resumeData.workExperience.forEach((work: any, index: number) => {
		const techStr = work.technologies.join(', ');
		const achievementsStr = work.achievements.map((a: string, i: number) => `${i + 1}. ${a}`).join(' ');

		contents.push({
			id: work.id,
			type: 'work',
			text: `Work Experience: ${work.title} at ${work.company} (${work.period}). Technologies used: ${techStr}. Key achievements: ${achievementsStr}`,
			metadata: {
				title: work.title,
				company: work.company,
				period: work.period,
				technologies: work.technologies,
				location: work.location,
			},
		});

		// Also create individual entries for each achievement
		work.achievements.forEach((achievement: string, achIndex: number) => {
			contents.push({
				id: `${work.id}_achievement_${achIndex}`,
				type: 'work',
				text: `At ${work.company} as ${work.title}: ${achievement}`,
				metadata: {
					title: work.title,
					company: work.company,
					period: work.period,
					technologies: work.technologies,
					achievement: achievement,
				},
			});
		});
	});

	// 4. Projects
	resumeData.projects.forEach((project: any) => {
		const techStr = project.technologies.join(', ');
		const achievementsStr = project.achievements.map((a: string, i: number) => `${i + 1}. ${a}`).join(' ');

		contents.push({
			id: project.id,
			type: 'project',
			text: `Project: ${project.name} (${project.period}). ${project.description}. Technologies: ${techStr}. Achievements: ${achievementsStr}`,
			metadata: {
				title: project.name,
				period: project.period,
				technologies: project.technologies,
				description: project.description,
			},
		});

		// Individual entries for each achievement
		project.achievements.forEach((achievement: string, achIndex: number) => {
			contents.push({
				id: `${project.id}_achievement_${achIndex}`,
				type: 'project',
				text: `${project.name} project: ${achievement}`,
				metadata: {
					title: project.name,
					period: project.period,
					technologies: project.technologies,
					achievement: achievement,
				},
			});
		});
	});

	// 5. Skills
	const skills = resumeData.skills;
	contents.push({
		id: 'skills_languages',
		type: 'skill',
		text: `Programming languages: ${skills.languages.join(', ')}`,
		metadata: {
			title: 'Programming Languages',
			category: 'languages',
			skills: skills.languages,
		},
	});

	contents.push({
		id: 'skills_technologies',
		type: 'skill',
		text: `Technologies and frameworks: ${skills.technologies.join(', ')}`,
		metadata: {
			title: 'Technologies',
			category: 'technologies',
			skills: skills.technologies,
		},
	});

	contents.push({
		id: 'skills_databases',
		type: 'skill',
		text: `Database experience: Relational databases (${skills.databases.relational.join(', ')}), NoSQL databases (${skills.databases.nosql.join(', ')})`,
		metadata: {
			title: 'Databases',
			category: 'databases',
			relational: skills.databases.relational,
			nosql: skills.databases.nosql,
		},
	});

	return contents;
}

async function uploadToWorker(contents: PortfolioContent[], workerUrl: string, apiKey?: string) {
	try {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		// Add API key if provided
		if (apiKey) {
			headers['Authorization'] = `Bearer ${apiKey}`;
		}

		const response = await fetch(`${workerUrl}/api/admin/ingest`, {
			method: 'POST',
			headers: headers,
			body: JSON.stringify(contents),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const result = await response.json();
		console.log('✅ Ingestion complete:', result);
		return result;
	} catch (error) {
		console.error('❌ Error uploading to worker:', error);
		throw error;
	}
}

// Main execution
async function main() {
	console.log('📚 Starting resume ingestion...\n');

	// Generate portfolio contents
	const contents = await ingestResume();
	console.log(`Generated ${contents.length} content items\n`);

	// Get worker URL from environment or use default
	const workerUrl = process.env.WORKER_URL || 'http://localhost:8787';
	const apiKey = process.env.ADMIN_API_KEY;

	console.log(`Uploading to: ${workerUrl}\n`);
	if (apiKey) {
		console.log('Using API key for authentication\n');
	}

	// Upload to worker
	await uploadToWorker(contents, workerUrl, apiKey);

	console.log('\n✨ Done!');
}

// Run if executed directly
if (require.main === module) {
	main().catch(console.error);
}

export { ingestResume, uploadToWorker };
