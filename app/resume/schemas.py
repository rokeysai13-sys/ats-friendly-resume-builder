from marshmallow import Schema, fields, validate

class EducationSchema(Schema):
    id = fields.Int(dump_only=True)
    school = fields.Str(required=True)
    degree = fields.Str(required=True)
    field = fields.Str()
    start_year = fields.Str()
    end_year = fields.Str()
    position = fields.Int()

class ExperienceSchema(Schema):
    id = fields.Int(dump_only=True)
    company = fields.Str(required=True)
    role = fields.Str(required=True)
    start_date = fields.Str()
    end_date = fields.Str()
    description = fields.Str()
    position = fields.Int()

class SkillSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, attribute="skill_name")
    category = fields.Str(required=True, attribute="level")
    position = fields.Int()

class ProjectSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(required=True)
    description = fields.Str()
    tech_stack = fields.Str()
    github_link = fields.Str()
    demo_link = fields.Str()
    created_date = fields.Str()
    url = fields.Str()
    position = fields.Int()

class CertificateSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    issuer = fields.Str()
    year = fields.Str()
    position = fields.Int()

class ResumeCreateSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    template_id = fields.Int(required=True)

class ResumeUpdateSchema(Schema):
    title = fields.Str(validate=validate.Length(min=1, max=100))
    template_id = fields.Int()
    personal_name = fields.Str()
    personal_email = fields.Email()
    personal_phone = fields.Str()
    personal_location = fields.Str()
    personal_linkedin = fields.Str()
    personal_portfolio = fields.Str()
    summary = fields.Str()

class ResumeResponseSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str()
    template_id = fields.Int()
    personal_name = fields.Str()
    personal_email = fields.Str()
    personal_phone = fields.Str()
    personal_location = fields.Str()
    personal_linkedin = fields.Str()
    personal_portfolio = fields.Str()
    summary = fields.Str()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    education = fields.List(fields.Nested(EducationSchema), dump_only=True)
    experience = fields.List(fields.Nested(ExperienceSchema), dump_only=True)
    skills = fields.List(fields.Nested(SkillSchema), dump_only=True)
    projects = fields.List(fields.Nested(ProjectSchema), dump_only=True)
    certificates = fields.List(fields.Nested(CertificateSchema), dump_only=True)

class PersonalInfoSchema(Schema):
    """Schema for updating personal information fields."""
    name = fields.Str(validate=validate.Length(min=1))
    email = fields.Email()
    phone = fields.Str()
    location = fields.Str()
    linkedinUrl = fields.Str()
    githubUrl = fields.Str()
    portfolioUrl = fields.Str()

# Legacy / Specific list schemas
class SkillsListSchema(Schema):
    skills = fields.List(fields.Nested(SkillSchema), required=True)
