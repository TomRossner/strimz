import Container from '../components/Container';
import Page from '../components/Page';
import PageTitle from '../components/PageTitle';
import React, { ChangeEvent, FormEvent, useState } from 'react';
import BackButton from '@/components/BackButton';
import PageDescription from '@/components/PageDescription';
import Button from '@/components/Button';
import CloseButton from '@/components/CloseButton';
import { useNavigate } from 'react-router-dom';
import { LuUpload } from "react-icons/lu";
import { BiTrash } from 'react-icons/bi';
import OptionDescription from '@/components/OptionDescription';

type ReportFormValues = {
  description: string;
  screenshots: string[];
}

const DEFAULT_FORM_VALUES = {
  description: '',
  screenshots: [],
}

const ReportsPage = () => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<ReportFormValues>(DEFAULT_FORM_VALUES);

  const handleSubmit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();

    console.log(formValues);
  }

  const handleUpload = (files: FileList) => {
    const filesArray = Array.from(files);
  
    Promise.all(
      filesArray.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
  
          reader.onload = () => {
            resolve(reader.result as string);
          };
  
          reader.onerror = () => {
            reject(new Error("Failed to read file"));
          };
        });
      })
    ).then(images => {
      setFormValues(formValues => ({
        ...formValues,
        screenshots: [...formValues.screenshots, ...images],
      }));
    });
  }  

  const handleChange = (ev: ChangeEvent<HTMLTextAreaElement>) => {
    setFormValues(formValues => ({
      ...formValues,
      [ev.target.name]: ev.target.value,
    }));
  }
  
  const handleUploadChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    handleUpload(e.target.files);
}

  return (
    <Page>
      <Container id='reportsPage'>
        <PageTitle>
          <BackButton />
          <span className='grow -mt-1'>Report a bug</span>
        </PageTitle>

        <PageDescription>Notice something wrong? Send us a quick report.</PageDescription>

        <form
          onSubmit={handleSubmit}
          className='text-white flex flex-col gap-5 h-full border border-stone-700 p-2'
        >
          <div className='flex w-full gap-2 flex-col'>
            <label htmlFor="description" className='font-semibold text-white'>Description</label>

            <textarea
              required
              name="description"
              id="description"
              placeholder='Tell us what’s not working...'
              onChange={handleChange}
              value={formValues.description}
              className='max-h-96 min-h-24 w-full bg-stone-800 text-white font-light rounded-sm border border-stone-400 p-1 outline-none'
            />
            
          </div>
          
          <div className='flex w-full gap-2 flex-col'>
            <p className='font-semibold text-white w-full flex justify-between'>
              <span className='flex items-end gap-2'>
                Screenshots ({formValues.screenshots.length})
                <span className='text-stone-500 italic text-sm'>Optional</span>
              </span>

              <label
                htmlFor='screenshots'
                className={`
                  flex
                  gap-1
                  items-center
                  cursor-pointer
                  px-4
                  py-1
                  rounded-sm
                  w-fit
                  text-white
                  text-center
                  bg-stone-700
                  hover:bg-stone-600
                  text-sm
                  font-light
                  hover:text-blue-300
                  transition-all
                  duration-100
                `}
              >
                <LuUpload />
                Upload screenshots
              </label>
            </p>

            <OptionDescription>Add screenshots to help us understand the issue.</OptionDescription>

            <input
              hidden
              type="file"
              accept='image/*'
              multiple
              id='screenshots'
              name='screenshots'
              onChange={handleUploadChange}
            />

            {formValues.screenshots && (
              <div className='grid grid-cols-2 w-full gap-1'>
                {formValues.screenshots.map(s => (
                  <div key={s} className='relative group w-fit h-fit col-span-1 bg-white'>
                    <Button
                      title='Remove'
                      onClick={() => setFormValues(formValues => ({
                        ...formValues,
                        screenshots: formValues.screenshots.filter(src => src !== s)
                      }))}
                      className={`
                        absolute
                        top-0
                        right-0
                        m-1
                        bg-black/60
                        text-white
                        text-xl
                        opacity-0
                        group-hover:opacity-100
                        transition-opacity
                        duration-200
                        z-10
                      `}
                    >
                      <BiTrash />
                    </Button>
              
                    <img
                      src={s}
                      className='w-full aspect-auto object-contain group-hover:opacity-70'
                      alt=''
                    />
                  </div>
                ))}
              </div>            
            )}
          </div>

          <div className='grow' />

          <div className="p-4 w-full bg-stone-800 flex gap-2 items-center justify-center flex-wrap md:flex-nowrap">
            <Button
                type='submit'
                disabled={!formValues.description}
                className='text-white w-full bg-slate-600 hover:bg-slate-500 disabled:text-stone-400'
            >
                Submit report
            </Button>
            <CloseButton
                text='Cancel'
                onClose={() => navigate(-1)}
                className='relative md:block text-stone-300 w-full text-base py-1 top-0 border-none hover:bg-stone-600 right-0'
            >
                Cancel
            </CloseButton>
        </div>
        </form>
      </Container>
    </Page>
  )
}

export default ReportsPage;